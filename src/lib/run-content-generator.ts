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
import type { PlayItem } from "@/services/play-providers/types";

/**
 * Server-only daily-run content generation.
 *
 * NO TEXT-ONLY OPINION ROUNDS IN NORMAL PLAY: every function here
 * either returns a fully visual question (every option/item has a
 * real imageUrl) or returns null. It never falls back to the
 * hardcoded game-prompts.ts packs -- those are abstract-preference
 * text ("Cinema vs Home cinema night", "Sweet vs Savory", "Keep 3
 * genres") with no visual representation. They remain defined in
 * game-prompts.ts only for the legacy game_sessions Round screens
 * (pre-daily-run history), never for new generation.
 *
 * CONTENT SUPPLY (This or That/Guess Mine): generateChoiceQuestions
 * prepares one LARGE candidate pool per visual kind up front (one
 * provider request per kind, each asking for 20-25 candidates instead
 * of just enough for a single pair), then builds all 5 pairs by
 * pulling from those already-fetched pools locally -- no per-question
 * network round trip, and one successful provider call can supply
 * several questions instead of exactly one. Domains are interleaved
 * (round-robin over a shuffled kind order) so a healthy pool of
 * artists doesn't have to carry the whole day alone. Returns EXACTLY
 * 5 real questions or null -- never a partial run for game-runs-
 * server.ts to accidentally persist.
 *
 * Sources pools via content-pool-server.ts's direct, in-process
 * resolveContentPool rather than choice-prompt.ts/blind-rank-
 * prompt.ts/keep-drop-prompt.ts's client-side fetch("/api/play/...")
 * calls, which have no meaning on the server -- this generator is what
 * makes today's run actually reach MusicBrainz/TMDb.
 */

function shuffle<T>(arr: readonly T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** How many candidates to ask for per kind when preparing This or
 * That/Guess Mine's shared pool -- large enough that a single healthy
 * domain can supply several of today's 5 pairs on its own, rather than
 * every question needing its own lucky provider call. Not literally
 * guaranteed (a provider can still return fewer), just what's
 * requested. */
const CHOICE_POOL_TARGET: Partial<Record<ContentKind, number>> = {
  artist: 25,
  movie: 25,
  tv: 20,
  person: 20,
};

function poolTargetFor(kind: ContentKind): number {
  return CHOICE_POOL_TARGET[kind] ?? CHOICE_POOL_SIZE;
}

/**
 * One provider request per visual kind (bounded: exactly
 * CHOICE_KINDS.length calls, run in parallel -- never "fetch until
 * satisfied"), each asking for a generous target count. Ranking
 * (familiarity/recognizability) already happened inside
 * resolveContentPool -- this only applies the one HARD rule, "does it
 * have a real image," never a soft familiarity cutoff: a candidate
 * that merely isn't the most-recognized item in its pool still stays
 * in the pool, just later in rank order.
 */
async function prepareChoicePools(spaceId: string): Promise<{ pools: Map<ContentKind, PlayItem[]>; rejectedNoImage: number }> {
  const pools = new Map<ContentKind, PlayItem[]>();
  let rejectedNoImage = 0;
  await Promise.all(
    CHOICE_KINDS.map(async (kind) => {
      const target = poolTargetFor(kind);
      const start = Date.now();
      const pool = await resolveContentPool(kind, target, spaceId);
      const withImages = pool.items.filter((i) => i.imageUrl);
      pools.set(kind, withImages);
      rejectedNoImage += pool.items.length - withImages.length;
      console.log(
        "[play/daily-run-pool]",
        JSON.stringify({
          kind,
          target,
          poolProvider: pool.provider,
          candidateCount: pool.items.length,
          withImagesCount: withImages.length,
          rejectedForNoImage: pool.items.length - withImages.length,
          durationMs: Date.now() - start,
        })
      );
    })
  );
  return { pools, rejectedNoImage };
}

/** Purely local cycling through the already-prepared pools looking for
 * a kind with at least 2 unused items left -- no network calls, so a
 * generous cap here costs nothing but a few array scans. Bounded
 * anyway (never "loop until satisfied forever") in case every pool is
 * simultaneously exhausted. */
const MAX_LOCAL_PAIRING_CYCLES = 25;

/**
 * The daily five for This or That/Guess Mine -- EXACTLY 5 real visual
 * questions, or null. Every option has a real imageUrl (the pools this
 * pulls from already filtered on that); no duplicate item appears
 * twice in the same day's five (a running exclude set); domains are
 * interleaved rather than one kind carrying the whole run.
 */
export async function generateChoiceQuestions(gameType: "this_or_that" | "guess_mine", spaceId: string): Promise<ChoicePrompt[] | null> {
  const genStart = Date.now();
  const { pools, rejectedNoImage } = await prepareChoicePools(spaceId);

  const usedIds = new Set<string>();
  const questions: ChoicePrompt[] = [];
  const kindOrder = shuffle(CHOICE_KINDS);
  let cursor = 0;
  let cycles = 0;

  while (questions.length < 5 && cycles < MAX_LOCAL_PAIRING_CYCLES) {
    cycles++;
    const kind = kindOrder[cursor % kindOrder.length];
    cursor++;
    const available = (pools.get(kind) ?? []).filter((i) => !usedIds.has(i.id));
    if (available.length < 2) continue; // this domain's prepared pool is used up -- try the next one, no new network call

    // Already familiarity-ranked by resolveContentPool -- adjacent
    // items in the pool are adjacent in recognizability tier, which is
    // what makes "I know both, hard choice" more likely than "famous
    // vs obscure."
    const [a, b] = available;
    questions.push({
      topic: `${a.title} or ${b.title}`,
      category: CONTENT_CATEGORY[kind],
      optionA: a.title,
      optionB: b.title,
      imageA: a.imageUrl,
      imageB: b.imageUrl,
      items: [a, b].map((i) => ({ id: i.id, title: i.title })),
      kind,
    });
    usedIds.add(a.id);
    usedIds.add(b.id);
  }

  const availableByKind = Object.fromEntries(CHOICE_KINDS.map((k) => [k, pools.get(k)?.length ?? 0]));
  const usableTotal = [...pools.values()].reduce((sum, p) => sum + p.length, 0);
  // Rejection breakdown: noImage is the only HARD rejection this pipeline
  // actually applies before pairing (see prepareChoicePools) -- everything
  // else (recognizability/niche fit) is SOFT ranking inside
  // resolveContentPool's familiarity scoring, never a hard cut, so there is
  // no "nicheMismatch" or "unknownSignal" reject count to report honestly;
  // they're reported as null rather than a fabricated number. duplicate is
  // structurally 0: each provider pool is already deduped by id, and the
  // pairing loop's usedIds set prevents an item from being reused across
  // pairs by construction (a consumed item, not a rejected one).
  const rejected = { noImage: rejectedNoImage, duplicate: 0, nicheMismatch: null, unknownSignal: null };

  if (questions.length < 5) {
    console.log(
      "[play/daily-run]",
      JSON.stringify({
        gameType,
        outcome: "insufficient_visual_questions",
        questionsBuilt: questions.length,
        availableByKind,
        rejected,
        usableTotal,
        generationMs: Date.now() - genStart,
      })
    );
    return null;
  }

  console.log(
    "[play/daily-run]",
    JSON.stringify({
      gameType,
      outcome: "success",
      questionsBuilt: questions.length,
      kindsUsed: questions.map((q) => q.kind),
      availableByKind,
      rejected,
      usableTotal,
      generationMs: Date.now() - genStart,
    })
  );
  return questions;
}

export async function generateBlindRankQuestion(spaceId: string): Promise<{ prompt: BlindRankPrompt; topic: string } | null> {
  for (const kind of shuffle(BLIND_RANK_KINDS)) {
    const start = Date.now();
    const pool = await resolveContentPool(kind, BLIND_RANK_FETCH_SIZE, spaceId);
    const withImages = pool.items.filter((i) => i.imageUrl).slice(0, BLIND_RANK_ROUND_SIZE);
    const accepted = withImages.length === BLIND_RANK_ROUND_SIZE;
    console.log(
      "[play/daily-run-question]",
      JSON.stringify({
        gameType: "blind_rank",
        kind,
        requestedCount: BLIND_RANK_FETCH_SIZE,
        poolProvider: pool.provider,
        candidateCount: pool.items.length,
        withImagesCount: withImages.length,
        accepted,
        durationMs: Date.now() - start,
      })
    );
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
    console.log(
      "[play/daily-run-question]",
      JSON.stringify({
        gameType: "keep3_drop2",
        kind,
        requestedCount: KEEP_DROP_FETCH_SIZE,
        poolProvider: pool.provider,
        candidateCount: pool.items.length,
        withImagesCount: withImages.length,
        accepted,
        durationMs: Date.now() - start,
      })
    );
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

/** Regenerates a single whole pair for the run-swap route -- tries
 * every visual kind (a one-off lookup, not the big prepared-pool path
 * generateChoiceQuestions uses, since a swap only ever needs one more
 * pair) excluding every id already used elsewhere in today's set. */
export async function generateReplacementChoiceQuestion(
  gameType: "this_or_that" | "guess_mine",
  spaceId: string,
  excludeIds: string[]
): Promise<ChoicePrompt | null> {
  for (const kind of shuffle(CHOICE_KINDS)) {
    const pool = await resolveContentPool(kind, CHOICE_POOL_SIZE, spaceId, excludeIds);
    const withImages = pool.items.filter((i) => i.imageUrl);
    if (withImages.length < 2) continue;
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
  return null;
}
