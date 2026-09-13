import { mbGet } from "@/lib/musicbrainz/client";
import { getArtistImageViaWikidata } from "@/lib/wikidata/client";
import { getReleaseGroupCoverArt } from "@/lib/coverartarchive/client";
import type { PlayItem } from "@/services/play-providers/types";

// Rotating seed tags steer *search* toward variety -- MusicBrainz returns
// whatever real artists/releases match each tag at request time, so this
// is not a hardcoded content list, just a way to keep results from always
// being the same genre.
const GENRE_SEEDS = ["pop", "hip hop", "r&b", "rock", "afrobeats", "amapiano", "indie", "electronic", "reggae", "soul"];

function randomSeed(): string {
  return GENRE_SEEDS[Math.floor(Math.random() * GENRE_SEEDS.length)];
}

type MbArtist = { id: string; name: string; disambiguation?: string };
type MbReleaseGroup = { id: string; title: string; "artist-credit"?: { name: string }[] };
type MbRecording = {
  id: string;
  title: string;
  "artist-credit"?: { name: string }[];
  releases?: { id: string; "release-group"?: { id: string } }[];
};

/**
 * MusicBrainz-backed Play content: real artists (image resolved via
 * Wikidata/Wikimedia), real albums and tracks (art via Cover Art Archive).
 * Every getter over-fetches a bit (4x the requested count) so excluded
 * (recently-seen) ids can be filtered out without a second round trip in
 * the common case.
 */
export async function getArtistPlayItems(count: number, exclude: Set<string> = new Set()): Promise<PlayItem[]> {
  const seed = randomSeed();
  const data = await mbGet<{ artists?: MbArtist[] }>(
    `/artist?query=${encodeURIComponent(`tag:${seed}`)}&limit=${Math.min(25, count * 4)}`,
    60 * 60 * 6
  );
  const artists = (data.artists ?? []).filter((a) => !exclude.has(a.id)).slice(0, count);

  return Promise.all(
    artists.map(async (a) => ({
      id: a.id,
      type: "artist" as const,
      title: a.name,
      subtitle: a.disambiguation ?? null,
      imageUrl: await getArtistImageViaWikidata(a.id),
      source: "musicbrainz",
      sourceUrl: `https://musicbrainz.org/artist/${a.id}`,
    }))
  );
}

export async function getAlbumPlayItems(count: number, exclude: Set<string> = new Set()): Promise<PlayItem[]> {
  const seed = randomSeed();
  const data = await mbGet<{ "release-groups"?: MbReleaseGroup[] }>(
    `/release-group?query=${encodeURIComponent(`tag:${seed} AND primarytype:album`)}&limit=${Math.min(25, count * 4)}`,
    60 * 60 * 6
  );
  const groups = (data["release-groups"] ?? []).filter((rg) => !exclude.has(rg.id)).slice(0, count);

  return Promise.all(
    groups.map(async (rg) => ({
      id: rg.id,
      type: "album" as const,
      title: rg.title,
      subtitle: rg["artist-credit"]?.map((c) => c.name).join(", ") ?? null,
      imageUrl: await getReleaseGroupCoverArt(rg.id),
      source: "musicbrainz",
      sourceUrl: `https://musicbrainz.org/release-group/${rg.id}`,
    }))
  );
}

export async function getTrackPlayItems(count: number, exclude: Set<string> = new Set()): Promise<PlayItem[]> {
  const seed = randomSeed();
  const data = await mbGet<{ recordings?: MbRecording[] }>(
    `/recording?query=${encodeURIComponent(`tag:${seed}`)}&limit=${Math.min(25, count * 4)}`,
    60 * 60 * 6
  );
  const recordings = (data.recordings ?? []).filter((r) => !exclude.has(r.id) && r.releases?.length).slice(0, count);

  return Promise.all(
    recordings.map(async (rec) => {
      const releaseGroupId = rec.releases?.[0]?.["release-group"]?.id;
      return {
        id: rec.id,
        type: "track" as const,
        title: rec.title,
        subtitle: rec["artist-credit"]?.map((c) => c.name).join(", ") ?? null,
        imageUrl: releaseGroupId ? await getReleaseGroupCoverArt(releaseGroupId) : null,
        source: "musicbrainz",
        sourceUrl: `https://musicbrainz.org/recording/${rec.id}`,
      };
    })
  );
}
