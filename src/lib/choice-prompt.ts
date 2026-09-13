import { fetchMusicPoolPrimed } from "@/services/music-pool-client";
import { MUSIC_CATEGORY } from "@/lib/play-music-categories";
import { THIS_OR_THAT_PACK, GUESS_MINE_PACK, randomFrom } from "@/lib/game-prompts";

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
export async function pickChoicePrompt(gameType: "this_or_that" | "guess_mine", spaceId: string): Promise<ChoicePrompt> {
  // Dynamic provider content is the primary source: every round tries a
  // real, image-first artist matchup first. Only when the pool comes up
  // short (live providers AND Keeps' own dropped songs both had nothing
  // usable) does it drop to the hardcoded pack -- last resort.
  const pool = await fetchMusicPoolPrimed("artist", 2, spaceId);
  if (pool.items.length === 2) {
    const [a, b] = pool.items;
    return {
      topic: `${a.title} or ${b.title}`,
      category: MUSIC_CATEGORY.artist,
      optionA: a.title,
      optionB: b.title,
      imageA: a.imageUrl,
      imageB: b.imageUrl,
      items: pool.items.map((i) => ({ id: i.id, title: i.title })),
    };
  }

  if (gameType === "guess_mine") {
    const p = randomFrom(GUESS_MINE_PACK);
    return { topic: p.question, category: p.category, optionA: p.optionA, optionB: p.optionB };
  }
  const p = randomFrom(THIS_OR_THAT_PACK);
  return { topic: `${p.optionA} or ${p.optionB}`, category: p.category, optionA: p.optionA, optionB: p.optionB };
}
