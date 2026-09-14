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

/**
 * Server-only daily-run content generation.
 *
 * NO TEXT-ONLY OPINION ROUNDS IN NORMAL PLAY: every function here
 * either returns a fully visual question (every option/item has a
 * real imageUrl) or returns null. It never falls back to the
 * hardcoded game-prompts.ts packs -- those are abstract-preference
 * text ("Cinema vs Home cinema night", "Sweet vs Savory", "Keep 3
 * genres") with no visual representation, and shipping them as plain
 * text cards is exactly the regression this file exists to prevent.
 * They remain defined in game-prompts.ts only for the legacy
 * game_sessions Round screens (pre-daily-run history), never for new
 * generation.
 *
 * Instead of falling back to text when one kind (say, music) comes up
 * short, every generator here tries EVERY visual kind available to
 * that game type (shuffled, so it's not always the same order) before
 * giving up. Only once every visual kind has failed does it return
 * null, and the caller (game-runs-server.ts) skips that slot rather
 * than inserting a naked text card.
 *
 * Sources pools via content-pool-server.ts's direct, in-process
 * resolveContentPool rather than choice-prompt.ts/blind-rank-
 * prompt.ts/keep-drop-prompt.ts's client-side fetch("/api/play/...")
 * calls, which have no meaning on the server (see the earlier fix in
 * this file's history) -- this generator is what makes today's run
 * actually reach MusicBrainz/TMDb.
 */

function shuffle<T>(arr: readonly T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** One log line per kind attempted -- lets a production log prove
 * which kinds were tried, in what order, and why each one did or
 * didn't produce a usable visual question, instead of just the final
 * outcome. Never logs a token/secret -- only counts and public
 * catalog titles. */
function logKindAttempt(entry: {
  gameType: string;
  kind: string;
  requestedCount: number;
  poolProvider: string;
  candidateCount: number;
  withImagesCount: number;
  accepted: boolean;
  durationMs: number;
}) {
  console.log("[play/daily-run-question]", JSON.stringify(entry));
}

export async function generateChoiceQuestion(
  gameType: "this_or_that" | "guess_mine",
  spaceId: string,
  excludeIds: string[]
): Promise<ChoicePrompt | null> {
  for (const kind of shuffle(CHOICE_KINDS)) {
    const start = Date.now();
    const pool = await resolveContentPool(kind, CHOICE_POOL_SIZE, spaceId, excludeIds);
    const withImages = pool.items.filter((i) => i.imageUrl);
    const accepted = withImages.length >= 2;
    logKindAttempt({
      gameType,
      kind,
      requestedCount: CHOICE_POOL_SIZE,
      poolProvider: pool.provider,
      candidateCount: pool.items.length,
      withImagesCount: withImages.length,
      accepted,
      durationMs: Date.now() - start,
    });
    if (!accepted) continue; // try the next visual kind instead of falling back to text
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
  return null; // every visual kind failed -- caller skips this slot, never a text fallback
}

export async function generateBlindRankQuestion(spaceId: string): Promise<{ prompt: BlindRankPrompt; topic: string } | null> {
  for (const kind of shuffle(BLIND_RANK_KINDS)) {
    const start = Date.now();
    const pool = await resolveContentPool(kind, BLIND_RANK_FETCH_SIZE, spaceId);
    const withImages = pool.items.filter((i) => i.imageUrl).slice(0, BLIND_RANK_ROUND_SIZE);
    const accepted = withImages.length === BLIND_RANK_ROUND_SIZE;
    logKindAttempt({
      gameType: "blind_rank",
      kind,
      requestedCount: BLIND_RANK_FETCH_SIZE,
      poolProvider: pool.provider,
      candidateCount: pool.items.length,
      withImagesCount: withImages.length,
      accepted,
      durationMs: Date.now() - start,
    });
    if (!accepted) continue;
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
  return null;
}

export async function generateKeepDropQuestion(spaceId: string): Promise<{ prompt: KeepDropPrompt; topic: string } | null> {
  for (const kind of shuffle(KEEP_DROP_KINDS)) {
    const start = Date.now();
    const pool = await resolveContentPool(kind, KEEP_DROP_FETCH_SIZE, spaceId);
    const withImages = pool.items.filter((i) => i.imageUrl).slice(0, KEEP_DROP_ROUND_SIZE);
    const accepted = withImages.length === KEEP_DROP_ROUND_SIZE;
    logKindAttempt({
      gameType: "keep3_drop2",
      kind,
      requestedCount: KEEP_DROP_FETCH_SIZE,
      poolProvider: pool.provider,
      candidateCount: pool.items.length,
      withImagesCount: withImages.length,
      accepted,
      durationMs: Date.now() - start,
    });
    if (!accepted) continue;
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
  return null;
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
