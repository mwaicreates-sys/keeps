import { timed } from "@/lib/perf-log";
import { getCachedImage, setCachedImage } from "@/services/play-providers/content-cache";

const ITEM_TYPE = "album_cover";

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

  const imageUrl = await timed("coverartarchive.release_group_art", async () => {
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
  }, { mbid, cache: "miss" });

  await setCachedImage(ITEM_TYPE, mbid, imageUrl);
  return imageUrl;
}
