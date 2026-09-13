import { resolveContentPool } from "@/services/content-pool-server";
import { CONTENT_CATEGORY, type ContentKind } from "@/lib/play-content-categories";
import { CHOICE_KINDS, CHOICE_POOL_SIZE, type ChoicePrompt } from "@/lib/choice-prompt";
import {
  BLIND_RANK_KINDS,
  BLIND_RANK_FETCH_SIZE,
  BLIND_RANK_ROUND_SIZE,
  TOPIC_BY_KIND as BLIND_RANK_TOPIC_BY_KIND,
  type BlindRankPrompt,
} from "@/lib/blind-rank-prompt";
import {
  ALL_KINDS as KEEP_DROP_KINDS,
  KEEP_DROP_FETCH_SIZE,
  KEEP_DROP_ROUND_SIZE,
  TOPIC_BY_KIND as KEEP_DROP_TOPIC_BY_KIND,
  type KeepDropPrompt,
} from "@/lib/keep-drop-prompt";
import { THIS_OR_THAT_PACK, GUESS_MINE_PACK, BLIND_RANK_PACK, KEEP3_DROP2_PACK, randomFrom } from "@/lib/game-prompts";

/**
 * Server-only daily-run content generation -- the exact same
 * selection rules as choice-prompt.ts/blind-rank-prompt.ts/
 * keep-drop-prompt.ts (same kind rotation, same overfetch-then-
 * require-images validation, same hardcoded-pack last resort), but
 * sourcing pools via content-pool-server.ts's direct, in-process
 * resolveContentPool instead of those modules' client-side
 * fetch("/api/play/...") calls.
 *
 * That distinction is why this file exists at all: choice-prompt.ts
 * etc. are correct and still used as-is by every real client
 * component (legacy Round screens' own swap actions), but calling them
 * from server code (as the daily-run generator does) would silently
 * fail -- a relative-URL fetch has no meaning outside a browser, and
 * every pool-client function swallows that failure into an empty pool
 * rather than throwing. This generator is what makes today's run
 * actually reach MusicBrainz/TMDb, not the hardcoded pack, every time.
 */

function randomKind<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** One log line per question/item-set generation attempt -- this is
 * the run-scoped diagnostic the pool-level "[play/music-pool]"/
 * "[play/movie-pool]" logs (in content-pool-server.ts, which already
 * fire correctly for the in-process path) don't capture on their own:
 * whether THIS generation attempt actually used the live provider or
 * fell back to a hardcoded pack. Never logs a token/secret -- only
 * counts and public catalog titles. */
function logQuestionGeneration(entry: {
  gameType: string;
  kind: string;
  requestedCount: number;
  poolProvider: string;
  candidateCount: number;
  withImagesCount: number;
  usedFallback: boolean;
  durationMs: number;
}) {
  console.log("[play/daily-run-question]", JSON.stringify(entry));
}

export async function generateChoiceQuestion(
  gameType: "this_or_that" | "guess_mine",
  spaceId: string,
  excludeIds: string[]
): Promise<ChoicePrompt> {
  const start = Date.now();
  const kind = randomKind(CHOICE_KINDS);
  const pool = await resolveContentPool(kind, CHOICE_POOL_SIZE, spaceId, excludeIds);
  const withImages = pool.items.filter((i) => i.imageUrl);
  const usedFallback = withImages.length < 2;
  logQuestionGeneration({
    gameType,
    kind,
    requestedCount: CHOICE_POOL_SIZE,
    poolProvider: pool.provider,
    candidateCount: pool.items.length,
    withImagesCount: withImages.length,
    usedFallback,
    durationMs: Date.now() - start,
  });
  if (!usedFallback) {
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

export async function generateBlindRankQuestion(spaceId: string): Promise<{ prompt: BlindRankPrompt; topic: string }> {
  const start = Date.now();
  const kind = randomKind(BLIND_RANK_KINDS);
  const pool = await resolveContentPool(kind, BLIND_RANK_FETCH_SIZE, spaceId);
  const withImages = pool.items.filter((i) => i.imageUrl).slice(0, BLIND_RANK_ROUND_SIZE);
  const usedFallback = withImages.length !== BLIND_RANK_ROUND_SIZE;
  logQuestionGeneration({
    gameType: "blind_rank",
    kind,
    requestedCount: BLIND_RANK_FETCH_SIZE,
    poolProvider: pool.provider,
    candidateCount: pool.items.length,
    withImagesCount: withImages.length,
    usedFallback,
    durationMs: Date.now() - start,
  });
  if (!usedFallback) {
    const items = withImages.map((i) => i.title);
    return {
      prompt: {
        items,
        category: CONTENT_CATEGORY[kind],
        images: Object.fromEntries(withImages.map((i) => [i.title, i.imageUrl])),
        ids: Object.fromEntries(withImages.map((i) => [i.title, i.id])),
        kind,
      },
      topic: BLIND_RANK_TOPIC_BY_KIND[kind],
    };
  }
  const p = randomFrom(BLIND_RANK_PACK);
  return { prompt: { items: p.items, category: p.category }, topic: p.topic };
}

export async function generateKeepDropQuestion(spaceId: string): Promise<{ prompt: KeepDropPrompt; topic: string }> {
  const start = Date.now();
  const kind = randomKind(KEEP_DROP_KINDS);
  const pool = await resolveContentPool(kind, KEEP_DROP_FETCH_SIZE, spaceId);
  const withImages = pool.items.filter((i) => i.imageUrl).slice(0, KEEP_DROP_ROUND_SIZE);
  const usedFallback = withImages.length !== KEEP_DROP_ROUND_SIZE;
  logQuestionGeneration({
    gameType: "keep3_drop2",
    kind,
    requestedCount: KEEP_DROP_FETCH_SIZE,
    poolProvider: pool.provider,
    candidateCount: pool.items.length,
    withImagesCount: withImages.length,
    usedFallback,
    durationMs: Date.now() - start,
  });
  if (!usedFallback) {
    const items = withImages.map((i) => i.title);
    return {
      prompt: {
        items,
        category: CONTENT_CATEGORY[kind],
        images: Object.fromEntries(withImages.map((i) => [i.title, i.imageUrl])),
        ids: Object.fromEntries(withImages.map((i) => [i.title, i.id])),
        kind,
      },
      topic: KEEP_DROP_TOPIC_BY_KIND[kind],
    };
  }
  const p = randomFrom(KEEP3_DROP2_PACK);
  return { prompt: { items: p.items, category: p.category }, topic: p.topic };
}

export type SwapReplacement = { title: string; id: string; imageUrl: string };

/** One replacement candidate of the given kind, excluding every id
 * already in play -- overfetches a small handful (rather than asking
 * for exactly 1) so there's room to require a real image, the same
 * "image, familiarity, niche, duplicate" bar as initial generation
 * applies, not a looser one just because it's a swap. Familiarity/
 * recognizability ranking already happened inside resolveContentPool
 * (each provider ranks before returning), so the first image-bearing
 * result is also the most-recognizable available replacement. */
export async function generateSwapReplacement(kind: ContentKind, spaceId: string, excludeIds: string[]): Promise<SwapReplacement | null> {
  const pool = await resolveContentPool(kind, 4, spaceId, excludeIds);
  const withImage = pool.items.find((i) => i.imageUrl);
  return withImage ? { title: withImage.title, id: withImage.id, imageUrl: withImage.imageUrl! } : null;
}
