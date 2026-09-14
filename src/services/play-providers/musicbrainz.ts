import { mbGet } from "@/lib/musicbrainz/client";
import { getWikimediaImageForQid } from "@/lib/wikidata/client";
import { getReleaseGroupCoverArt, getReleaseGroupCoverArtBatch } from "@/lib/coverartarchive/client";
import { getFreshReleases, type FreshRelease } from "@/lib/listenbrainz/client";
import { rankByFamiliarity, pickSeedGenre, type FamiliarityProfile } from "@/services/play-providers/familiarity";
import {
  getCachedArtistIdByName,
  setCachedArtistIdByName,
  getCachedArtistVisualsBatch,
  setCachedArtistVisualsBatch,
} from "@/services/play-providers/content-cache";
import { mapWithConcurrency } from "@/lib/bounded-concurrency";
import type { PlayItem } from "@/services/play-providers/types";

// Wikidata/Wikimedia have no in-process throttle the way MusicBrainz
// does (see mbGet's queue) -- bounded concurrency here is what keeps a
// large pool's cache misses from firing 20+ of those requests at once.
const ARTIST_IMAGE_RESOLVE_CONCURRENCY = 5;

const NO_PROFILE: FamiliarityProfile = {
  familiarNames: new Set(),
  itemSignalScores: new Map(),
  tasteArtistIds: new Set(),
  tasteArtistNames: new Set(),
  tasteGenres: new Set(),
};

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

/** Prefers the space's own "Tune your Play" genre chips when any exist
 * (so the search fallback leans toward what this space is actually
 * into), otherwise rotates through the generic seed list as before. */
function randomSeed(profile: FamiliarityProfile): string {
  return pickSeedGenre(profile, GENRE_SEEDS);
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

export type ArtistVisual = { name: string; disambiguation: string | null; imageUrl: string | null };

/** The real MBID -> Wikidata -> Wikimedia resolution chain, with no
 * cache read/write of its own -- resolveArtistVisualsBatch is what
 * decides which mbids actually need this (the cache misses) and what
 * writes the result back, once, for the whole batch. */
async function resolveArtistVisualUncached(mbid: string, knownName?: string): Promise<ArtistVisual | null> {
  let name = knownName ?? null;
  let disambiguation: string | null = null;
  let imageUrl: string | null = null;
  try {
    const lookup = await lookupArtist(mbid);
    if (lookup && isUsableArtistName(lookup.name)) {
      name = lookup.name;
      disambiguation = lookup.disambiguation;
      if (lookup.wikidataQid) imageUrl = await getWikimediaImageForQid(lookup.wikidataQid).catch(() => null);
    }
  } catch {
    // MusicBrainz lookup failed/rate-limited -- fall back to whatever
    // name the caller already had (e.g. from ListenBrainz or search)
    // rather than losing the item entirely.
  }
  if (!name) return null;
  return { name, disambiguation, imageUrl };
}

/**
 * The batch entry point every pool builder should use when it already
 * knows its whole candidate list up front: ONE play_content_cache read
 * for every mbid (not one per mbid), cache misses resolved through the
 * real MBID -> Wikidata -> Wikimedia chain with bounded concurrency
 * (never all-at-once), then ONE batched write for whatever resolved.
 * Replaces what used to be N individual getCachedArtistVisual reads +
 * up to N individual setCachedArtistVisual writes inside a
 * Promise.all -- same resolution logic, same cache semantics, just one
 * Supabase round trip on each side instead of one per candidate.
 */
export async function resolveArtistVisualsBatch(items: { mbid: string; knownName?: string }[]): Promise<Map<string, ArtistVisual | null>> {
  const result = new Map<string, ArtistVisual | null>();
  if (items.length === 0) return result;

  const ids = items.map((i) => i.mbid);
  const cacheStart = Date.now();
  const cached = await getCachedArtistVisualsBatch(ids);
  const misses = items.filter((i) => !cached.has(i.mbid));
  for (const [mbid, visual] of cached) result.set(mbid, visual);
  console.log(
    "[perf]",
    JSON.stringify({ label: "artist_visual_batch", requested: ids.length, cacheHits: cached.size, cacheMisses: misses.length, cacheReadMs: Date.now() - cacheStart })
  );

  if (misses.length > 0) {
    const resolveStart = Date.now();
    const resolved = await mapWithConcurrency(misses, ARTIST_IMAGE_RESOLVE_CONCURRENCY, async (m) => ({
      mbid: m.mbid,
      visual: await resolveArtistVisualUncached(m.mbid, m.knownName),
    }));
    console.log(
      "[perf]",
      JSON.stringify({ label: "artist_visual_batch", phase: "resolve_misses", count: misses.length, durationMs: Date.now() - resolveStart })
    );
    const toWrite: { mbid: string; visual: ArtistVisual }[] = [];
    for (const { mbid, visual } of resolved) {
      result.set(mbid, visual);
      if (visual) toWrite.push({ mbid, visual });
    }
    await setCachedArtistVisualsBatch(toWrite);
  }

  return result;
}

/**
 * Single-mbid convenience wrapper around resolveArtistVisualsBatch, for
 * the handful of call sites that only ever need one artist at a time
 * (an exact-name search hit). Same cache semantics, just not worth a
 * batch of one.
 */
export async function resolveArtistVisual(mbid: string, knownName?: string): Promise<ArtistVisual | null> {
  const result = await resolveArtistVisualsBatch([{ mbid, knownName }]);
  return result.get(mbid) ?? null;
}

/** Real MusicBrainz folksonomy tags for one artist -- the closest thing
 * MusicBrainz has to a "genre," and the mechanism "Tune your Play" uses
 * to adapt suggestions toward what a user just picked (e.g. picking SZA
 * surfaces her actual "r&b"/"neo soul" tags, then searches those tags
 * for more artists) instead of guessing at adjacency. */
export async function getArtistTags(mbid: string): Promise<string[]> {
  try {
    const data = await mbGet<{ tags?: { name: string; count: number }[] }>(`/artist/${mbid}?inc=tags`, 60 * 60 * 24 * 7);
    return (data.tags ?? [])
      .sort((a, b) => b.count - a.count)
      .map((t) => t.name)
      .slice(0, 3);
  } catch {
    return [];
  }
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

  // Preferred flow: ListenBrainz already gave real MBIDs, so this is
  // one batched play_content_cache read for every attempted candidate
  // (not one per candidate) -- a miss does the MusicBrainz lookup ->
  // Wikidata -> Wikimedia chain and gets cached for next time, in one
  // batched write at the end.
  const visuals = await resolveArtistVisualsBatch(attempted.map((a) => ({ mbid: a.mbid, knownName: a.name })));
  const resolved = attempted.map((a) => {
    const visual = visuals.get(a.mbid);
    return {
      id: a.mbid,
      type: "artist" as const,
      title: visual?.name ?? a.name,
      subtitle: visual?.disambiguation ?? null,
      imageUrl: visual?.imageUrl ?? null,
      source: "musicbrainz",
      discoverySource: "listenbrainz",
      imageSource: visual?.imageUrl ? "wikimedia" : null,
      sourceUrl: `https://musicbrainz.org/artist/${a.mbid}`,
    };
  });

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

/**
 * Priority #1 per the product spec: artists the space directly seeded
 * in "Tune your Play". A real MusicBrainz *lookup* (never search) for
 * each -- these mbids are already known-good, so there's no search-
 * fallback cost, just the same identity+image resolution every other
 * artist item goes through.
 */
async function anchoredArtistItems(profile: FamiliarityProfile, count: number, exclude: Set<string>): Promise<PlayItem[]> {
  const candidates = shuffle([...profile.tasteArtistIds].filter((id) => !exclude.has(id))).slice(0, count);
  if (candidates.length === 0) return [];
  const visuals = await resolveArtistVisualsBatch(candidates.map((mbid) => ({ mbid })));
  const resolved = candidates.map((mbid) => {
    const visual = visuals.get(mbid);
    if (!visual || !isUsableArtistName(visual.name)) return null;
    return {
      id: mbid,
      type: "artist" as const,
      title: visual.name,
      subtitle: visual.disambiguation,
      imageUrl: visual.imageUrl,
      source: "musicbrainz",
      discoverySource: "taste_seed",
      imageSource: visual.imageUrl ? "wikimedia" : null,
      sourceUrl: `https://musicbrainz.org/artist/${mbid}`,
    };
  });
  return resolved.filter((i): i is NonNullable<typeof i> => i !== null);
}

export async function getArtistPlayItems(
  count: number,
  exclude: Set<string> = new Set(),
  profile: FamiliarityProfile = NO_PROFILE
): Promise<MusicFetchResult> {
  // Taste-seeded artists come first, ahead of ListenBrainz discovery --
  // per the spec's priority order, a direct taste-seed match beats even
  // fresh/current content.
  const anchored = profile.tasteArtistIds.size > 0 ? await anchoredArtistItems(profile, count, exclude) : [];
  const excludeAfterAnchor = new Set([...exclude, ...anchored.map((i) => i.id)]);
  if (anchored.length >= count) {
    return { items: anchored.slice(0, count), listenBrainzFailed: false, musicBrainzFailed: false };
  }

  const fromListenBrainz = await artistsFromListenBrainz(count - anchored.length, excludeAfterAnchor, profile);
  const combined = [...anchored, ...fromListenBrainz.items];
  if (combined.length >= count) {
    return { items: combined.slice(0, count), listenBrainzFailed: fromListenBrainz.failed, musicBrainzFailed: false };
  }

  // Fallback only -- ListenBrainz didn't surface enough usable, distinct
  // artists. Never the primary discovery mechanism.
  const remaining = count - combined.length;
  try {
    const seed = randomSeed(profile);
    const data = await mbGet<{ artists?: MbArtist[] }>(
      `/artist?query=${encodeURIComponent(`tag:${seed}`)}&limit=${Math.min(25, remaining * 6)}`,
      60 * 60 * 6
    );
    const alreadyIds = new Set([...excludeAfterAnchor, ...fromListenBrainz.items.map((i) => i.id)]);
    const candidates = (data.artists ?? []).filter((a) => !alreadyIds.has(a.id) && isUsableArtistName(a.name));
    // Rank before resolving images -- familiarity decides which
    // candidates are worth spending an image lookup on, not just
    // whichever the search happened to return first.
    const artists = rankByFamiliarity(
      candidates.map((a) => ({ id: a.id, title: a.name, subtitle: a.disambiguation ?? null })),
      profile,
      remaining
    ).map((ranked) => candidates.find((a) => a.id === ranked.id)!);
    // Name/disambiguation already came from this search result --
    // resolveArtistVisualsBatch still checks the cache first for the
    // image (one batched read for every artist, not one per artist),
    // and backfills the cache with this known name on a miss, so a
    // repeat appearance of this artist is a cache hit next time
    // regardless of which path found it.
    const visuals = await resolveArtistVisualsBatch(artists.map((a) => ({ mbid: a.id, knownName: a.name })));
    const extra = artists.map((a) => {
      const imageUrl = visuals.get(a.id)?.imageUrl ?? null;
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
    });
    return { items: [...combined, ...extra], listenBrainzFailed: fromListenBrainz.failed, musicBrainzFailed: false };
  } catch {
    return { items: combined, listenBrainzFailed: fromListenBrainz.failed, musicBrainzFailed: true };
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
  //
  // Deliberately NOT batched (unlike the two fixed-candidate-list
  // callers above/below): this loop is adaptive -- it stops as soon as
  // it has overfetchCap images, so it doesn't know its full candidate
  // list up front the way a batch read needs. It's also not the
  // pattern that caused the measured N+1 burst: each iteration is
  // already sequential (one `await` at a time, not a Promise.all
  // firing many at once), and album/track pools aren't part of the
  // choice generator this incident was in (Blind Rank/Keep 3 Drop 2
  // only). Left as single-item resolution.
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

/**
 * Priority #1 for albums: real release-groups *by* the space's seeded
 * artists (not just the artists themselves) -- "an album from an
 * artist dropped/seeded" is explicitly called out as good content in
 * the spec. Draws from a few random seeded artists per call so a
 * 5-artist seed doesn't always surface the same one first.
 */
async function anchoredAlbumItems(profile: FamiliarityProfile, count: number, exclude: Set<string>): Promise<PlayItem[]> {
  const artistMbids = shuffle([...profile.tasteArtistIds]).slice(0, Math.max(2, Math.min(4, count)));
  if (artistMbids.length === 0) return [];

  const groups: MbReleaseGroup[] = [];
  for (const artistMbid of artistMbids) {
    try {
      const data = await mbGet<{ "release-groups"?: MbReleaseGroup[] }>(
        `/release-group?artist=${artistMbid}&primarytype=album&limit=10`,
        60 * 60 * 24
      );
      for (const rg of data["release-groups"] ?? []) {
        if (!exclude.has(rg.id) && !isGenericAlbumTitle(rg.title)) groups.push(rg);
      }
    } catch {
      // One seeded artist's release-groups failing shouldn't cost the
      // others -- just fewer anchored candidates this round.
    }
  }

  // Same "adaptive early-break, deliberately not batched" reasoning as
  // albumsFromListenBrainz above.
  const withImages: PlayItem[] = [];
  for (const rg of shuffle(groups)) {
    if (withImages.length >= count) break;
    const imageUrl = await getReleaseGroupCoverArt(rg.id);
    if (!imageUrl) continue; // image-first: an anchored pick without art isn't worth it when the artist alone can't visually anchor an album round
    withImages.push({
      id: rg.id,
      type: "album",
      title: rg.title,
      subtitle: rg["artist-credit"]?.map((c) => c.name).join(", ") ?? null,
      imageUrl,
      source: "musicbrainz",
      discoverySource: "taste_seed",
      imageSource: "coverartarchive",
      sourceUrl: `https://musicbrainz.org/release-group/${rg.id}`,
    });
  }
  return withImages;
}

export async function getAlbumPlayItems(
  count: number,
  exclude: Set<string> = new Set(),
  profile: FamiliarityProfile = NO_PROFILE
): Promise<MusicFetchResult> {
  const anchored = profile.tasteArtistIds.size > 0 ? await anchoredAlbumItems(profile, count, exclude) : [];
  const excludeAfterAnchor = new Set([...exclude, ...anchored.map((i) => i.id)]);
  if (anchored.length >= count) {
    return { items: anchored.slice(0, count), listenBrainzFailed: false, musicBrainzFailed: false };
  }

  const fromListenBrainz = await albumsFromListenBrainz(count - anchored.length, excludeAfterAnchor, profile);
  const combined = [...anchored, ...fromListenBrainz.items];
  if (combined.length >= count) {
    return { items: combined.slice(0, count), listenBrainzFailed: fromListenBrainz.failed, musicBrainzFailed: false };
  }

  const remaining = count - combined.length;
  try {
    const seed = randomSeed(profile);
    const data = await mbGet<{ "release-groups"?: MbReleaseGroup[] }>(
      `/release-group?query=${encodeURIComponent(`tag:${seed} AND primarytype:album`)}&limit=${Math.min(25, remaining * 6)}`,
      60 * 60 * 6
    );
    const alreadyIds = new Set([...excludeAfterAnchor, ...fromListenBrainz.items.map((i) => i.id)]);
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
    const coverArt = await getReleaseGroupCoverArtBatch(groups.map((rg) => rg.id));
    const extra = groups.map((rg) => {
      const imageUrl = coverArt.get(rg.id) ?? null;
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
    });
    return { items: [...combined, ...extra], listenBrainzFailed: fromListenBrainz.failed, musicBrainzFailed: false };
  } catch {
    return { items: combined, listenBrainzFailed: fromListenBrainz.failed, musicBrainzFailed: true };
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
    const seed = randomSeed(profile);
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

    const releaseGroupIds = recordings.map((rec) => rec.releases?.[0]?.["release-group"]?.id).filter((id): id is string => !!id);
    const coverArt = await getReleaseGroupCoverArtBatch(releaseGroupIds);
    const items = recordings.map((rec) => {
      const releaseGroupId = rec.releases?.[0]?.["release-group"]?.id;
      const imageUrl = releaseGroupId ? coverArt.get(releaseGroupId) ?? null : null;
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
    });
    return { items, listenBrainzFailed: false, musicBrainzFailed: false };
  } catch {
    return { items: [], listenBrainzFailed: false, musicBrainzFailed: true };
  }
}

/**
 * Real MusicBrainz artists tagged with a given genre/tag -- how "Tune
 * your Play" adapts its suggestions once the user has picked a couple
 * of artists (see getArtistTags): look up what they're actually tagged
 * with, then search *that* tag for more real, recognizable names,
 * rather than guessing at adjacency.
 */
export async function searchArtistsByTag(tag: string, count: number, exclude: Set<string> = new Set()): Promise<PlayItem[]> {
  try {
    // Overfetch: some candidates won't have a usable image, and we'd
    // rather quietly skip those than hand the UI a blank card (see
    // resolveVisualBatch below).
    const overfetchCount = Math.min(25, count * 3);
    const data = await mbGet<{ artists?: MbArtist[] }>(
      `/artist?query=${encodeURIComponent(`tag:"${tag}"`)}&limit=${overfetchCount}`,
      60 * 60 * 6
    );
    const candidates = (data.artists ?? []).filter((a) => !exclude.has(a.id) && isUsableArtistName(a.name));
    return resolveVisualBatch(candidates, count, "musicbrainz");
  } catch {
    return [];
  }
}

/** Resolves a batch of MusicBrainz artist search hits into visual
 * PlayItems, in parallel, keeping only ones with a real image and
 * stopping once `count` usable ones are found -- the "overfetch, then
 * keep only what actually has a picture" rule from the performance
 * pass, shared by every artist-search-shaped caller (Tune search,
 * Tune suggestions-by-tag). */
async function resolveVisualBatch(candidates: MbArtist[], count: number, discoverySource: string): Promise<PlayItem[]> {
  const visuals = await resolveArtistVisualsBatch(candidates.map((a) => ({ mbid: a.id, knownName: a.name })));
  const resolved = candidates.map((a) => {
    const visual = visuals.get(a.id);
    return {
      id: a.id,
      type: "artist" as const,
      title: visual?.name ?? a.name,
      subtitle: visual?.disambiguation ?? a.disambiguation ?? null,
      imageUrl: visual?.imageUrl ?? null,
      source: "musicbrainz",
      discoverySource,
      imageSource: visual?.imageUrl ? "wikimedia" : null,
      sourceUrl: `https://musicbrainz.org/artist/${a.id}`,
    };
  });
  return resolved.filter((i) => i.imageUrl).slice(0, count);
}

/**
 * Free-text artist search for "Tune your Play" -- a real MusicBrainz
 * name search, resolved into the same visual PlayItem shape (real
 * photo via Wikidata/Wikimedia) as everywhere else artists appear.
 * Used only by the taste-seeding search box, never by round
 * generation itself.
 */
export async function searchArtists(query: string, count = 8): Promise<PlayItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Exact-name, single-result lookups (Tune's cold-start suggestions
  // re-searching the same curated names) skip MusicBrainz entirely on
  // a cache hit -- no search call, no queue wait at all.
  if (count === 1) {
    const cachedId = await getCachedArtistIdByName(trimmed);
    if (cachedId) {
      const visual = await resolveArtistVisual(cachedId);
      if (visual) {
        return [
          {
            id: cachedId,
            type: "artist",
            title: visual.name,
            subtitle: visual.disambiguation,
            imageUrl: visual.imageUrl,
            source: "musicbrainz",
            discoverySource: "musicbrainz",
            imageSource: visual.imageUrl ? "wikimedia" : null,
            sourceUrl: `https://musicbrainz.org/artist/${cachedId}`,
          },
        ];
      }
    }
  }

  try {
    const data = await mbGet<{ artists?: MbArtist[] }>(
      `/artist?query=${encodeURIComponent(`artist:"${trimmed}"`)}&limit=${Math.min(20, count * 2)}`,
      60 * 60 * 24
    );
    const candidates = (data.artists ?? []).filter((a) => isUsableArtistName(a.name)).slice(0, count);
    if (count === 1 && candidates[0]) await setCachedArtistIdByName(trimmed, candidates[0].id);
    // Deliberately not image-filtered here (unlike resolveVisualBatch):
    // this also backs the plain search box, where a user typing an
    // exact name expects to find that artist even if Wikidata happens
    // to have no photo for them, not have it silently disappear.
    const visuals = await resolveArtistVisualsBatch(candidates.map((a) => ({ mbid: a.id, knownName: a.name })));
    const items = candidates.map((a) => {
      const visual = visuals.get(a.id);
      return {
        id: a.id,
        type: "artist" as const,
        title: visual?.name ?? a.name,
        subtitle: visual?.disambiguation ?? a.disambiguation ?? null,
        imageUrl: visual?.imageUrl ?? null,
        source: "musicbrainz",
        discoverySource: "musicbrainz",
        imageSource: visual?.imageUrl ? "wikimedia" : null,
        sourceUrl: `https://musicbrainz.org/artist/${a.id}`,
      };
    });
    return items;
  } catch {
    return [];
  }
}
