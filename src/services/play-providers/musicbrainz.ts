import { mbGet } from "@/lib/musicbrainz/client";
import { getArtistImageViaWikidata, getWikimediaImageForQid } from "@/lib/wikidata/client";
import { getReleaseGroupCoverArt } from "@/lib/coverartarchive/client";
import { getFreshReleases, type FreshRelease } from "@/lib/listenbrainz/client";
import { rankByFamiliarity, type FamiliarityProfile } from "@/services/play-providers/familiarity";
import type { PlayItem } from "@/services/play-providers/types";

const NO_PROFILE: FamiliarityProfile = { familiarNames: new Set(), itemSignalScores: new Map() };

/**
 * The music content flow, per provider role:
 *   CURRENT/DISCOVERY -> ListenBrainz (fresh-releases) -- PRIMARY
 *   METADATA           -> MusicBrainz
 *   ALBUM ART          -> Cover Art Archive
 *   ARTIST IMAGES      -> Wikidata / Wikimedia
 *
 * Every getter tries ListenBrainz's fresh-releases feed first (real
 * current content, MBIDs already in hand -- no search needed); a
 * MusicBrainz tag-seeded *search* only runs as a fallback when
 * ListenBrainz didn't surface enough distinct, usable items. Both paths
 * resolve through the same art/image clients, so every returned
 * PlayItem's `source`/`discoverySource`/`imageSource` honestly reflects
 * which one actually produced it.
 *
 * Every getter also returns whether ListenBrainz/MusicBrainz genuinely
 * *failed* (errored/rate-limited), as opposed to just "had nothing to
 * offer" -- reported through, never swallowed silently.
 */
export type MusicFetchResult = {
  items: PlayItem[];
  listenBrainzFailed: boolean;
  musicBrainzFailed: boolean;
};

// Rotating seed tags steer *search* toward variety -- MusicBrainz returns
// whatever real artists/releases match each tag at request time, so this
// is not a hardcoded content list, just a way to keep results from always
// being the same genre.
const GENRE_SEEDS = ["pop", "hip hop", "r&b", "rock", "afrobeats", "amapiano", "indie", "electronic", "reggae", "soul"];

function randomSeed(): string {
  return GENRE_SEEDS[Math.floor(Math.random() * GENRE_SEEDS.length)];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Pseudo-artist/compilation credits that make bad game content -- "who
// are you keeping, Various Artists or Unknown Artist?" isn't a real
// choice. Filtered out wherever an artist name is seen, from either
// ListenBrainz or MusicBrainz search.
const UNUSABLE_ARTIST_NAMES = new Set([
  "various artists",
  "various",
  "unknown artist",
  "unknown",
  "[unknown]",
  "n/a",
  "not applicable",
  "traditional",
  "[data deleted]",
  "[no artist]",
]);

function isUsableArtistName(name: string | null | undefined): boolean {
  if (!name) return false;
  const normalized = name.trim().toLowerCase();
  return normalized.length > 0 && !UNUSABLE_ARTIST_NAMES.has(normalized);
}

// Generic compilation titles ("Greatest Hits", "Best Of ...") are real
// MusicBrainz content but poor game content -- everyone has a "Greatest
// Hits". Only filtered from the *search* fallback; ListenBrainz's fresh
// releases are real new albums and don't need this.
const GENERIC_ALBUM_TITLE_PATTERNS = [/^greatest hits$/i, /^the best of/i, /^best of /i, /^collection$/i, /^anthology$/i];

function isGenericAlbumTitle(title: string): boolean {
  return GENERIC_ALBUM_TITLE_PATTERNS.some((re) => re.test(title.trim()));
}

export type ArtistLookup = { id: string; name: string; disambiguation: string | null; wikidataQid: string | null };

function extractWikidataQid(relations: { type?: string; url?: { resource?: string } }[] | undefined): string | null {
  for (const rel of relations ?? []) {
    const resource = rel.url?.resource ?? "";
    const match = resource.match(/wikidata\.org\/wiki\/(Q\d+)/);
    if (match) return match[1];
  }
  return null;
}

/**
 * Step 4 of the preferred artist flow: MusicBrainz artist *lookup* by
 * MBID (never search) -- canonical name/disambiguation, with its
 * Wikidata relation resolved in the very same request so the
 * ListenBrainz-primary path never needs two MusicBrainz calls for one
 * artist. Also used standalone by /api/play/diagnostics'
 * `musicbrainz.artist_lookup` check.
 */
export async function lookupArtist(mbid: string): Promise<ArtistLookup | null> {
  const data = await mbGet<{ name?: string; disambiguation?: string; relations?: { type?: string; url?: { resource?: string } }[] }>(
    `/artist/${mbid}?inc=url-rels`,
    60 * 60 * 24 * 7
  );
  if (!data.name) return null;
  return { id: mbid, name: data.name, disambiguation: data.disambiguation || null, wikidataQid: extractWikidataQid(data.relations) };
}

type MbArtist = { id: string; name: string; disambiguation?: string };
type MbReleaseGroup = { id: string; title: string; "artist-credit"?: { name: string }[] };
type MbRecording = {
  id: string;
  title: string;
  "artist-credit"?: { name: string }[];
  releases?: { id: string; "release-group"?: { id: string } }[];
};

async function tryFreshReleases(): Promise<{ releases: FreshRelease[]; failed: boolean }> {
  try {
    return { releases: await getFreshReleases(), failed: false };
  } catch {
    return { releases: [], failed: true };
  }
}

async function artistsFromListenBrainz(
  count: number,
  exclude: Set<string>,
  profile: FamiliarityProfile = NO_PROFILE
): Promise<{ items: PlayItem[]; failed: boolean }> {
  const { releases, failed } = await tryFreshReleases();
  const seen = new Set<string>();
  const candidates: { name: string; mbid: string }[] = [];
  for (const r of releases) {
    const mbid = r.artist_mbids?.[0];
    const name = r.artist_credit_name;
    if (!mbid || !isUsableArtistName(name) || exclude.has(mbid) || seen.has(mbid)) continue;
    seen.add(mbid);
    candidates.push({ name: name!, mbid });
  }

  // Bounded over-fetch (not unlimited -- each candidate costs one
  // rate-limited MusicBrainz lookup) so we have room to prefer both
  // candidates whose image actually resolved (image-first) and
  // candidates the space is more likely to actually recognize
  // (familiarity-first), without the round waiting on more MusicBrainz
  // round trips than necessary.
  const shuffled = shuffle(candidates);
  const attempted = shuffled.slice(0, Math.min(shuffled.length, count + 4));

  const resolved = await Promise.all(
    attempted.map(async (a) => {
      // Preferred flow: ListenBrainz already gave a real MBID, so go
      // straight to a MusicBrainz *lookup* (step 4) -- never a search --
      // for canonical metadata + its Wikidata relation in one request,
      // then resolve the Wikimedia image from that (steps 5-6). If the
      // lookup itself fails, keep ListenBrainz's own artist name and
      // just skip the image rather than losing the round.
      let title = a.name;
      let disambiguation: string | null = null;
      let imageUrl: string | null = null;
      try {
        const lookup = await lookupArtist(a.mbid);
        if (lookup && isUsableArtistName(lookup.name)) {
          title = lookup.name;
          disambiguation = lookup.disambiguation;
          if (lookup.wikidataQid) imageUrl = await getWikimediaImageForQid(lookup.wikidataQid).catch(() => null);
        }
      } catch {
        // MusicBrainz lookup failed/rate-limited -- fine, we still have a real artist name from ListenBrainz.
      }
      return {
        id: a.mbid,
        type: "artist" as const,
        title,
        subtitle: disambiguation,
        imageUrl,
        source: "musicbrainz",
        discoverySource: "listenbrainz",
        imageSource: imageUrl ? "wikimedia" : null,
        sourceUrl: `https://musicbrainz.org/artist/${a.mbid}`,
      };
    })
  );

  // Image-first, then familiarity-first within each group: prefer
  // resolved candidates that actually have a photo AND that the space
  // is likely to recognize, only falling back to photo-less/less-
  // familiar ones to still fill the round.
  const withImages = resolved.filter((i) => i.imageUrl);
  const withoutImages = resolved.filter((i) => !i.imageUrl);
  const rankedWithImages = rankByFamiliarity(withImages, profile, count);
  const need = count - rankedWithImages.length;
  const rankedFiller = need > 0 ? rankByFamiliarity(withoutImages, profile, need).slice(0, need) : [];
  return { items: [...rankedWithImages, ...rankedFiller].slice(0, count), failed };
}

export async function getArtistPlayItems(
  count: number,
  exclude: Set<string> = new Set(),
  profile: FamiliarityProfile = NO_PROFILE
): Promise<MusicFetchResult> {
  const fromListenBrainz = await artistsFromListenBrainz(count, exclude, profile);
  if (fromListenBrainz.items.length >= count) {
    return { items: fromListenBrainz.items.slice(0, count), listenBrainzFailed: fromListenBrainz.failed, musicBrainzFailed: false };
  }

  // Fallback only -- ListenBrainz didn't surface enough usable, distinct
  // artists. Never the primary discovery mechanism.
  const remaining = count - fromListenBrainz.items.length;
  try {
    const seed = randomSeed();
    const data = await mbGet<{ artists?: MbArtist[] }>(
      `/artist?query=${encodeURIComponent(`tag:${seed}`)}&limit=${Math.min(25, remaining * 6)}`,
      60 * 60 * 6
    );
    const alreadyIds = new Set([...exclude, ...fromListenBrainz.items.map((i) => i.id)]);
    const candidates = (data.artists ?? []).filter((a) => !alreadyIds.has(a.id) && isUsableArtistName(a.name));
    // Rank before resolving images -- familiarity decides which
    // candidates are worth spending an image lookup on, not just
    // whichever the search happened to return first.
    const artists = rankByFamiliarity(
      candidates.map((a) => ({ id: a.id, title: a.name, subtitle: a.disambiguation ?? null })),
      profile,
      remaining
    ).map((ranked) => candidates.find((a) => a.id === ranked.id)!);
    const extra = await Promise.all(
      artists.map(async (a) => {
        const imageUrl = await getArtistImageViaWikidata(a.id);
        return {
          id: a.id,
          type: "artist" as const,
          title: a.name,
          subtitle: a.disambiguation ?? null,
          imageUrl,
          source: "musicbrainz",
          discoverySource: "musicbrainz",
          imageSource: imageUrl ? "wikimedia" : null,
          sourceUrl: `https://musicbrainz.org/artist/${a.id}`,
        };
      })
    );
    return { items: [...fromListenBrainz.items, ...extra], listenBrainzFailed: fromListenBrainz.failed, musicBrainzFailed: false };
  } catch {
    return { items: fromListenBrainz.items, listenBrainzFailed: fromListenBrainz.failed, musicBrainzFailed: true };
  }
}

async function albumsFromListenBrainz(
  count: number,
  exclude: Set<string>,
  profile: FamiliarityProfile = NO_PROFILE
): Promise<{ items: PlayItem[]; failed: boolean }> {
  const { releases, failed } = await tryFreshReleases();
  const seen = new Set<string>();
  const candidates: FreshRelease[] = [];
  for (const r of releases) {
    const rgMbid = r.release_group_mbid;
    if (!rgMbid || !r.release_name || exclude.has(rgMbid) || seen.has(rgMbid)) continue;
    if (r.artist_credit_name && !isUsableArtistName(r.artist_credit_name)) continue; // skip "Various Artists" compilations
    seen.add(rgMbid);
    candidates.push(r);
  }

  // Cover Art Archive lookups aren't MusicBrainz-rate-limited, so we can
  // afford to walk further into the shuffled list in search of real art
  // (image-first) -- over-fetching a small multiple of `count` gives
  // the familiarity ranker below something to actually choose between,
  // rather than just taking whatever resolved first.
  const overfetchCap = count * 3;
  const withImages: PlayItem[] = [];
  const withoutImages: PlayItem[] = [];
  for (const r of shuffle(candidates)) {
    if (withImages.length >= overfetchCap) break;
    const imageUrl = await getReleaseGroupCoverArt(r.release_group_mbid!);
    const item = {
      id: r.release_group_mbid!,
      type: "album" as const,
      title: r.release_name!,
      subtitle: r.artist_credit_name ?? null,
      imageUrl,
      source: "musicbrainz",
      discoverySource: "listenbrainz",
      imageSource: imageUrl ? "coverartarchive" : null,
      sourceUrl: `https://musicbrainz.org/release-group/${r.release_group_mbid}`,
    };
    if (imageUrl) withImages.push(item);
    else if (withoutImages.length < count) withoutImages.push(item);
  }
  const rankedWithImages = rankByFamiliarity(withImages, profile, count);
  const need = count - rankedWithImages.length;
  const rankedFiller = need > 0 ? rankByFamiliarity(withoutImages, profile, need).slice(0, need) : [];
  return { items: [...rankedWithImages, ...rankedFiller].slice(0, count), failed };
}

export async function getAlbumPlayItems(
  count: number,
  exclude: Set<string> = new Set(),
  profile: FamiliarityProfile = NO_PROFILE
): Promise<MusicFetchResult> {
  const fromListenBrainz = await albumsFromListenBrainz(count, exclude, profile);
  if (fromListenBrainz.items.length >= count) {
    return { items: fromListenBrainz.items.slice(0, count), listenBrainzFailed: fromListenBrainz.failed, musicBrainzFailed: false };
  }

  const remaining = count - fromListenBrainz.items.length;
  try {
    const seed = randomSeed();
    const data = await mbGet<{ "release-groups"?: MbReleaseGroup[] }>(
      `/release-group?query=${encodeURIComponent(`tag:${seed} AND primarytype:album`)}&limit=${Math.min(25, remaining * 6)}`,
      60 * 60 * 6
    );
    const alreadyIds = new Set([...exclude, ...fromListenBrainz.items.map((i) => i.id)]);
    const candidates = (data["release-groups"] ?? []).filter((rg) => {
      if (alreadyIds.has(rg.id) || isGenericAlbumTitle(rg.title)) return false;
      const artistName = rg["artist-credit"]?.map((c) => c.name).join(", ");
      return !artistName || isUsableArtistName(artistName);
    });
    const groups = rankByFamiliarity(
      candidates.map((rg) => ({ id: rg.id, title: rg.title, subtitle: rg["artist-credit"]?.map((c) => c.name).join(", ") ?? null })),
      profile,
      remaining
    ).map((ranked) => candidates.find((rg) => rg.id === ranked.id)!);
    const extra = await Promise.all(
      groups.map(async (rg) => {
        const imageUrl = await getReleaseGroupCoverArt(rg.id);
        return {
          id: rg.id,
          type: "album" as const,
          title: rg.title,
          subtitle: rg["artist-credit"]?.map((c) => c.name).join(", ") ?? null,
          imageUrl,
          source: "musicbrainz",
          discoverySource: "musicbrainz",
          imageSource: imageUrl ? "coverartarchive" : null,
          sourceUrl: `https://musicbrainz.org/release-group/${rg.id}`,
        };
      })
    );
    return { items: [...fromListenBrainz.items, ...extra], listenBrainzFailed: fromListenBrainz.failed, musicBrainzFailed: false };
  } catch {
    return { items: fromListenBrainz.items, listenBrainzFailed: fromListenBrainz.failed, musicBrainzFailed: true };
  }
}

/** No ListenBrainz equivalent for individual fresh tracks -- fresh-
 * releases is album-level. Tracks stay MusicBrainz-search-only, so
 * discoverySource honestly equals source here rather than pretending a
 * discovery layer that doesn't exist for this kind. */
export async function getTrackPlayItems(
  count: number,
  exclude: Set<string> = new Set(),
  profile: FamiliarityProfile = NO_PROFILE
): Promise<MusicFetchResult> {
  try {
    const seed = randomSeed();
    const data = await mbGet<{ recordings?: MbRecording[] }>(
      `/recording?query=${encodeURIComponent(`tag:${seed}`)}&limit=${Math.min(25, count * 6)}`,
      60 * 60 * 6
    );
    const candidates = (data.recordings ?? []).filter((r) => {
      if (exclude.has(r.id) || !r.releases?.length) return false;
      const artistName = r["artist-credit"]?.map((c) => c.name).join(", ");
      return !artistName || isUsableArtistName(artistName);
    });
    const recordings = rankByFamiliarity(
      candidates.map((r) => ({ id: r.id, title: r.title, subtitle: r["artist-credit"]?.map((c) => c.name).join(", ") ?? null })),
      profile,
      count
    ).map((ranked) => candidates.find((r) => r.id === ranked.id)!);

    const items = await Promise.all(
      recordings.map(async (rec) => {
        const releaseGroupId = rec.releases?.[0]?.["release-group"]?.id;
        const imageUrl = releaseGroupId ? await getReleaseGroupCoverArt(releaseGroupId) : null;
        return {
          id: rec.id,
          type: "track" as const,
          title: rec.title,
          subtitle: rec["artist-credit"]?.map((c) => c.name).join(", ") ?? null,
          imageUrl,
          source: "musicbrainz",
          discoverySource: "musicbrainz",
          imageSource: imageUrl ? "coverartarchive" : null,
          sourceUrl: `https://musicbrainz.org/recording/${rec.id}`,
        };
      })
    );
    return { items, listenBrainzFailed: false, musicBrainzFailed: false };
  } catch {
    return { items: [], listenBrainzFailed: false, musicBrainzFailed: true };
  }
}
