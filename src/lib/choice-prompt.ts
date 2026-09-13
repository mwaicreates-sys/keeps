import { fetchContentPool, fetchContentPoolPrimed, prefetchContentPool } from "@/services/content-pool-client";
import { CONTENT_CATEGORY, type ContentKind } from "@/lib/play-content-categories";
import { THIS_OR_THAT_PACK, GUESS_MINE_PACK, randomFrom } from "@/lib/game-prompts";

/** Requested pool size for a 2-item matchup -- overfetched (not a
 * literal 2) so there's room to require both sides to actually have an
 * image instead of accepting whatever the pool's own image-first (but
 * not image-required) ranking hands back. Exported so every prefetch
 * call site warms the exact same pool key this module will consume. */
export const CHOICE_POOL_SIZE = 6;

/** This or That / Guess Mine draw from any of these -- always a
 * same-kind pair (movie vs movie, actor vs actor), never mixed, per
 * the visual-quiz rule's own examples. Music (artist) sits alongside
 * the new TMDb kinds; "album"/"track" are deliberately excluded here
 * (a named-entity matchup reads better for artists/movies/shows/people
 * than for individual albums/tracks -- unchanged from before). */
const CHOICE_KINDS: ContentKind[] = ["artist", "movie", "tv", "person"];

/** Warms every kind pickChoicePrompt might randomly draw from, so
 * whichever one it actually picks next is already warm -- pickKeepDropPrompt
 * does the same thing for its own kind set (warmAllKeepDropKinds). */
export function warmAllChoiceKinds(spaceId: string): void {
  for (const kind of CHOICE_KINDS) prefetchContentPool(kind, CHOICE_POOL_SIZE, spaceId);
}

export type ChoicePrompt = {
  topic: string;
  category: string;
  optionA: string;
  optionB: string;
  /** Only present for a real, provider-backed matchup -- when set, the
   * round renders as large image cards instead of text pills. */
  imageA?: string | null;
  imageB?: string | null;
  /** The provider items' own ids, stored so future rounds can exclude
   * them (see /api/play/music-pool and /api/play/movie-pool's
   * recently-used lookups). */
  items?: { id: string; title: string }[];
  /** Which content kind this matchup used -- lets the round screen
   * record familiarity signals against the right item type instead of
   * assuming "artist". Absent for the rare hardcoded-pack fallback. */
  kind?: ContentKind;
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
  // real, image-first matchup first (music or, now, movies/TV) --
  // dropping to the hardcoded pack only when the pool comes up short.
  //
  // Overfetch (request more than the 2 we need) rather than asking for
  // exactly 2 -- the pool itself is image-first but not image-*required*,
  // so a literal count-of-2 request can come back with one imaged item
  // and one that resolved no image at all, which would otherwise render
  // as a real photo next to a permanently-stuck "?" placeholder. Only a
  // pair where BOTH sides have a real image counts as a visual matchup.
  const kind = CHOICE_KINDS[Math.floor(Math.random() * CHOICE_KINDS.length)];
  const pool = excludeIds?.length
    ? await fetchContentPool(kind, CHOICE_POOL_SIZE, spaceId, excludeIds)
    : await fetchContentPoolPrimed(kind, CHOICE_POOL_SIZE, spaceId);
  const withImages = pool.items.filter((i) => i.imageUrl);
  if (withImages.length >= 2) {
    const [a, b] = withImages;
    return {
      topic: `${a.title} or ${b.title}`,
      category: CONTENT_CATEGORY[kind],
      optionA: a.title,
      optionB: b.title,
      imageA: a.imageUrl,
      imageB: b.imageUrl,
      items: [a, b].map((i) => ({ id: i.id, title: i.title })),
      kind,
    };
  }

  if (gameType === "guess_mine") {
    const p = randomFrom(GUESS_MINE_PACK);
    return { topic: p.question, category: p.category, optionA: p.optionA, optionB: p.optionB };
  }
  const p = randomFrom(THIS_OR_THAT_PACK);
  return { topic: `${p.optionA} or ${p.optionB}`, category: p.category, optionA: p.optionA, optionB: p.optionB };
}
