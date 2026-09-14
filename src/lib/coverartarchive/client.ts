import { timed } from "@/lib/perf-log";
import { getCachedImage, setCachedImage, getCachedImagesBatch, setCachedImagesBatch } from "@/services/play-providers/content-cache";
import { mapWithConcurrency } from "@/lib/bounded-concurrency";

const ITEM_TYPE = "album_cover";
// Cover Art Archive has no documented per-IP rate limit the way
// MusicBrainz does, but "no limit enforced" isn't the same as "fire
// them all at once" -- bounded concurrency for cache-miss resolution,
// same reasoning as the artist-photo batch path.
const COVER_ART_CONCURRENCY = 6;

async function fetchCoverArt(mbid: string): Promise<string | null> {
  try {
    const res = await fetch(`https://coverartarchive.org/release-group/${mbid}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 * 7 }, // album art doesn't change -- cache a week
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { images?: { front?: boolean; thumbnails?: Record<string, string>; image?: string }[] };
    const front = data.images?.find((i) => i.front) ?? data.images?.[0];
    return front?.thumbnails?.large ?? front?.image ?? null;
  } catch {
    return null;
  }
}

/** Server-only. No key needed; a 404 just means "this release-group has
 * no art yet," not a failure. Checks the persistent play_content_cache
 * first -- cover art never changes once released, so a cache hit skips
 * the network call entirely instead of re-fetching it every time this
 * release-group is shown again. */
export async function getReleaseGroupCoverArt(mbid: string): Promise<string | null> {
  const cached = await getCachedImage(ITEM_TYPE, mbid);
  if (cached !== undefined) {
    console.log("[perf]", JSON.stringify({ label: "coverartarchive.release_group_art", mbid, cache: "hit", ms: 0 }));
    return cached;
  }

  const imageUrl = await timed("coverartarchive.release_group_art", () => fetchCoverArt(mbid), { mbid, cache: "miss" });
  await setCachedImage(ITEM_TYPE, mbid, imageUrl);
  return imageUrl;
}

/** Same resolution as getReleaseGroupCoverArt, for a whole candidate
 * list at once: one batched play_content_cache read for every id up
 * front, cache misses resolved with bounded concurrency, then one
 * batched write for whatever resolved -- instead of a Supabase read
 * (and, on a miss, a Supabase write) per release-group. Used by the
 * two fixed-candidate-list album/track pool builders; the two
 * adaptive early-break pickers (which stop as soon as they have enough
 * images and don't know their full candidate list up front) are left
 * on the single-item path. */
export async function getReleaseGroupCoverArtBatch(mbids: string[]): Promise<Map<string, string | null>> {
  const ids = [...new Set(mbids)];
  const result = new Map<string, string | null>();
  if (ids.length === 0) return result;

  const cached = await getCachedImagesBatch(ITEM_TYPE, ids);
  for (const [id, url] of cached) result.set(id, url);
  const misses = ids.filter((id) => !cached.has(id));
  console.log("[perf]", JSON.stringify({ label: "coverartarchive.release_group_art_batch", requested: ids.length, cacheHits: cached.size, cacheMisses: misses.length }));
  if (misses.length === 0) return result;

  const resolvedStart = Date.now();
  const resolved = await mapWithConcurrency(misses, COVER_ART_CONCURRENCY, async (mbid) => ({ mbid, imageUrl: await fetchCoverArt(mbid) }));
  console.log("[perf]", JSON.stringify({ label: "coverartarchive.release_group_art_batch", phase: "resolve_misses", count: misses.length, durationMs: Date.now() - resolvedStart }));

  for (const { mbid, imageUrl } of resolved) result.set(mbid, imageUrl);
  await setCachedImagesBatch(ITEM_TYPE, resolved.map(({ mbid, imageUrl }) => ({ itemId: mbid, imageUrl })));
  return result;
}
