import { fetchMusicPoolPrimed } from "@/services/music-pool-client";
import { MUSIC_CATEGORY } from "@/lib/play-music-categories";
import { BLIND_RANK_PACK, randomFrom } from "@/lib/game-prompts";

export type BlindRankPrompt = {
  items: string[];
  category: string;
  /** Only present for a real, provider-backed set (e.g. 5 albums) --
   * looked up by item title so the string-keyed ranking/result logic
   * never has to change shape. */
  images?: Record<string, string | null>;
};

export const BLIND_RANK_ROUND_SIZE = 5;

/** Shared by the history view (starting the first round) and the round
 * view (starting the next one), so both pick content identically. */
export async function pickBlindRankPrompt(spaceId: string): Promise<{ prompt: BlindRankPrompt; topic: string }> {
  const pool = await fetchMusicPoolPrimed("album", BLIND_RANK_ROUND_SIZE, spaceId);
  if (pool.items.length === BLIND_RANK_ROUND_SIZE) {
    const items = pool.items.map((i) => i.title);
    return {
      prompt: {
        items,
        category: MUSIC_CATEGORY.album,
        images: Object.fromEntries(pool.items.map((i) => [i.title, i.imageUrl])),
      },
      topic: "Rank these albums",
    };
  }
  const p = randomFrom(BLIND_RANK_PACK);
  return { prompt: { items: p.items, category: p.category }, topic: p.topic };
}
