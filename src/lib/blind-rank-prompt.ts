import { fetchMusicPoolPrimed, fetchSwapItem } from "@/services/music-pool-client";
import { MUSIC_CATEGORY } from "@/lib/play-music-categories";
import { BLIND_RANK_PACK, randomFrom } from "@/lib/game-prompts";

export type BlindRankPrompt = {
  items: string[];
  category: string;
  /** Only present for a real, provider-backed set (e.g. 5 albums) --
   * looked up by item title so the string-keyed ranking/result logic
   * never has to change shape. */
  images?: Record<string, string | null>;
  /** Real provider item ids, keyed by title -- only present alongside
   * `images`. Lets the "Don't know this" swap exclude the right item
   * and record a familiarity signal against its real id. */
  ids?: Record<string, string>;
};

export const BLIND_RANK_ROUND_SIZE = 5;
/** Requested pool size -- overfetched (not a literal 5) so there's room
 * to require every ranked item to actually have a real cover, instead
 * of accepting whatever the pool's own image-first (but not image-
 * required) ranking hands back. Exported so prefetch call sites warm
 * the exact same pool key this module consumes. */
export const BLIND_RANK_FETCH_SIZE = 8;

/** Shared by the history view (starting the first round) and the round
 * view (starting the next one), so both pick content identically. */
export async function pickBlindRankPrompt(spaceId: string): Promise<{ prompt: BlindRankPrompt; topic: string }> {
  const pool = await fetchMusicPoolPrimed("album", BLIND_RANK_FETCH_SIZE, spaceId);
  const withImages = pool.items.filter((i) => i.imageUrl).slice(0, BLIND_RANK_ROUND_SIZE);
  if (withImages.length === BLIND_RANK_ROUND_SIZE) {
    const items = withImages.map((i) => i.title);
    return {
      prompt: {
        items,
        category: MUSIC_CATEGORY.album,
        images: Object.fromEntries(withImages.map((i) => [i.title, i.imageUrl])),
        ids: Object.fromEntries(withImages.map((i) => [i.title, i.id])),
      },
      topic: "Rank these albums",
    };
  }
  const p = randomFrom(BLIND_RANK_PACK);
  return { prompt: { items: p.items, category: p.category }, topic: p.topic };
}

/** Fetch a single replacement album, excluding every id already in this
 * round -- used by "Don't know this?" to swap out one item without
 * regenerating the whole round. Returns null if no provider item is
 * available (round stays as-is; nothing to swap in). */
export async function swapBlindRankItem(
  spaceId: string,
  currentIds: string[]
): Promise<{ title: string; id: string; imageUrl: string | null } | null> {
  const replacement = await fetchSwapItem("album", spaceId, currentIds);
  return replacement ? { title: replacement.title, id: replacement.id, imageUrl: replacement.imageUrl } : null;
}
