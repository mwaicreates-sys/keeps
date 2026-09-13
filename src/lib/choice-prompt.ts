import { fetchMusicPool, fetchMusicPoolPrimed } from "@/services/music-pool-client";
import { MUSIC_CATEGORY } from "@/lib/play-music-categories";
import { THIS_OR_THAT_PACK, GUESS_MINE_PACK, randomFrom } from "@/lib/game-prompts";

/** Requested pool size for a 2-item matchup -- overfetched (not a
 * literal 2) so there's room to require both sides to actually have an
 * image instead of accepting whatever the pool's own image-first (but
 * not image-required) ranking hands back. Exported so every prefetch
 * call site warms the exact same pool key this module will consume. */
export const CHOICE_POOL_SIZE = 6;

export type ChoicePrompt = {
  topic: string;
  category: string;
  optionA: string;
  optionB: string;
  /** Only present for a real, provider-backed matchup (e.g. two
   * MusicBrainz artists) -- when set, the round renders as large image
   * cards instead of text pills. */
  imageA?: string | null;
  imageB?: string | null;
  /** The provider items' own ids, stored so future rounds can exclude
   * them (see /api/play/music-pool's recently-used lookup). */
  items?: { id: string; title: string }[];
};

/**
 * Shared by This or That and Guess Mine's history (starting a round) and
 * round (starting the *next* one) views, so both always pick content the
 * same way instead of two copies drifting apart.
 */
export async function pickChoicePrompt(
  gameType: "this_or_that" | "guess_mine",
  spaceId: string,
  excludeIds?: string[]
): Promise<ChoicePrompt> {
  // Dynamic provider content is the primary source: every round tries a
  // real, image-first artist matchup first. Only when the pool comes up
  // short (live providers AND Keeps' own dropped songs both had nothing
  // usable) does it drop to the hardcoded pack -- last resort.
  //
  // Overfetch (request more than the 2 we need) rather than asking for
  // exactly 2 -- the pool itself is image-first but not image-*required*,
  // so a literal count-of-2 request can come back with one imaged item
  // and one that resolved no image at all, which would otherwise render
  // as a real photo next to a permanently-stuck "?" placeholder. Only a
  // pair where BOTH sides have a real image counts as a visual matchup.
  const pool = excludeIds?.length
    ? await fetchMusicPool("artist", CHOICE_POOL_SIZE, spaceId, excludeIds)
    : await fetchMusicPoolPrimed("artist", CHOICE_POOL_SIZE, spaceId);
  const withImages = pool.items.filter((i) => i.imageUrl);
  if (withImages.length >= 2) {
    const [a, b] = withImages;
    return {
      topic: `${a.title} or ${b.title}`,
      category: MUSIC_CATEGORY.artist,
      optionA: a.title,
      optionB: b.title,
      imageA: a.imageUrl,
      imageB: b.imageUrl,
      items: [a, b].map((i) => ({ id: i.id, title: i.title })),
    };
  }

  if (gameType === "guess_mine") {
    const p = randomFrom(GUESS_MINE_PACK);
    return { topic: p.question, category: p.category, optionA: p.optionA, optionB: p.optionB };
  }
  const p = randomFrom(THIS_OR_THAT_PACK);
  return { topic: `${p.optionA} or ${p.optionB}`, category: p.category, optionA: p.optionA, optionB: p.optionB };
}
