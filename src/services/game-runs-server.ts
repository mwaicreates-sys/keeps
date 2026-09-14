import { createClient } from "@/lib/supabase/server";
import { resolveTimeZone, localDateString } from "@/lib/timezone";
import { generateChoiceQuestions, generateBlindRankQuestion, generateKeepDropQuestion } from "@/lib/run-content-generator";
import { pickTop5Prompt } from "@/lib/top5-prompt";
import { sourceForKind } from "@/lib/play-content-categories";
import { requiredAnswerCount, RUN_GAME_TYPES, type RunGameType } from "@/lib/game-run-types";
import { computeRunResult, type RunResult } from "@/lib/game-run-result";
import type { ChoicePrompt } from "@/lib/choice-prompt";
import type { BlindRankPrompt } from "@/lib/blind-rank-prompt";
import type { KeepDropPrompt } from "@/lib/keep-drop-prompt";
import type { Tables, Json } from "@/lib/types";

export type GameRunRow = Tables<"game_runs">;
export type GameRunAnswerRow = Tables<"game_run_answers">;

/**
 * A shared run is only ever generated/keyed off ONE timezone for the
 * whole space, never per player -- otherwise two players in different
 * zones (or just past midnight in one of their zones) could resolve
 * different run_dates and end up with two independently-generated
 * runs instead of the one shared set the whole daily-run model depends
 * on. space.timezone is that single source of truth; a brand-new space
 * with none yet falls back to UTC (never a hardcoded region) until
 * TimezoneSync initializes it from whichever member opens the app
 * first (see TimezoneSync.tsx) -- from then on it's stable for the
 * life of the space regardless of who's asking.
 */
export async function getSpaceTimezone(spaceId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("spaces").select("timezone").eq("id", spaceId).maybeSingle();
  return resolveTimeZone(data?.timezone ?? null);
}

/** The space's local calendar date, "YYYY-MM-DD" -- the run_date a new
 * run is stamped with, and the key used to find today's existing one.
 * Both players always resolve the exact same value for the exact same
 * space, which is what guarantees they land on the exact same
 * game_runs row. */
export async function getTodayRunDateForSpace(spaceId: string): Promise<string> {
  const tz = await getSpaceTimezone(spaceId);
  return localDateString(new Date(), tz);
}

export async function getExistingRun(spaceId: string, gameType: RunGameType, runDate: string): Promise<GameRunRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("game_runs")
    .select("*")
    .eq("space_id", spaceId)
    .eq("game_type", gameType)
    .eq("run_date", runDate)
    .maybeSingle();
  return data ?? null;
}

export async function getRunAnswer(runId: string, userId: string): Promise<GameRunAnswerRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("game_run_answers").select("*").eq("run_id", runId).eq("user_id", userId).maybeSingle();
  return data ?? null;
}

/** Generates the questions/items for a brand-new run -- only ever
 * called once per (space, game_type, day), by whichever player opens
 * the game first that day; the unique constraint on game_runs is what
 * guarantees the *other* player gets the exact same set instead of a
 * second, independently-generated one (see getOrCreateTodayRun below).
 *
 * Goes through run-content-generator.ts, not choice-prompt.ts/
 * blind-rank-prompt.ts/keep-drop-prompt.ts directly -- those pick
 * content via a client-side fetch() that has no meaning on the server
 * (see run-content-generator.ts's own docs). This is still the exact
 * same provider engine (MusicBrainz/TMDb via content-pool-server.ts)
 * and the exact same overfetch-and-require-images validation -- but
 * NEVER the hardcoded-pack text fallback: per the "no text-only
 * opinion rounds" rule, a question that can't be made visual is
 * skipped, not downgraded to a beige text card.
 *
 * Returns null when a full valid set couldn't be generated -- EXACTLY
 * 5 real visual questions or no run at all, never a partial "2 of 5."
 * getOrCreateTodayRun does not save a run in that case, so a
 * transient provider outage never gets "cached" as today's permanent
 * (bad) run; the next request just tries generation again. */
async function generateQuestions(gameType: RunGameType, spaceId: string): Promise<{ questions: unknown[]; topic: string; category: string } | null> {
  if (gameType === "this_or_that" || gameType === "guess_mine") {
    // generateChoiceQuestions owns its own bounded retries, per-kind
    // pool cache, and cross-slot duplicate prevention -- it returns
    // either exactly 5 real questions or null, never anything shorter.
    const questions = await generateChoiceQuestions(gameType, spaceId);
    if (!questions) return null;
    return { questions, topic: "Today's 5", category: questions[0].category };
  }
  if (gameType === "blind_rank") {
    const generated = await generateBlindRankQuestion(spaceId);
    if (!generated) return null;
    return { questions: [generated.prompt], topic: generated.topic, category: generated.prompt.category };
  }
  if (gameType === "keep3_drop2") {
    const generated = await generateKeepDropQuestion(spaceId);
    if (!generated) return null;
    return { questions: [generated.prompt], topic: generated.topic, category: generated.prompt.category };
  }
  // top5 -- a plain random topic from the hardcoded pack, no provider
  // involved and no visual requirement (it's a free-text ranked list,
  // not an opinion-card round the "no text-only" rule targets).
  const p = await pickTop5Prompt();
  return { questions: [p], topic: p.topic, category: p.category };
}

/** Safe (no secrets, just public catalog titles/counts) per-item
 * summary of a freshly generated run's final question set -- logged
 * once per new run so it's possible to prove from server logs alone
 * that a real run used musicbrainz/listenbrainz/tmdb and not a silent
 * fallback to the hardcoded pack. */
function summarizeGeneratedQuestions(gameType: RunGameType, questions: unknown[]): { title: string; kind: string; source: string; hasImage: boolean }[] {
  if (gameType === "this_or_that" || gameType === "guess_mine") {
    return (questions as ChoicePrompt[]).flatMap((q) => [
      { title: q.optionA, kind: q.kind ?? "fallback", source: q.kind ? sourceForKind(q.kind) : "hardcoded_pack", hasImage: !!q.imageA },
      { title: q.optionB, kind: q.kind ?? "fallback", source: q.kind ? sourceForKind(q.kind) : "hardcoded_pack", hasImage: !!q.imageB },
    ]);
  }
  if (gameType === "blind_rank" || gameType === "keep3_drop2") {
    const prompt = (questions as (BlindRankPrompt | KeepDropPrompt)[])[0];
    return prompt.items.map((item) => ({
      title: item,
      kind: prompt.kind ?? "fallback",
      source: prompt.kind ? sourceForKind(prompt.kind) : "hardcoded_pack",
      hasImage: !!prompt.images?.[item],
    }));
  }
  // top5 -- free-text list, nothing provider-backed to summarize.
  return [];
}

/**
 * The single entry point for "today's run" -- returns the existing row
 * if one already exists for this space+game_type+local-day (whether
 * this player or their partner triggered its creation), or generates
 * and inserts a brand new one. The unique constraint on
 * (space_id, game_type, run_date) is what makes this race-safe: if the
 * partner's own request wins a simultaneous insert, this falls through
 * to re-selecting their row instead of erroring or creating a
 * duplicate -- so both players always end up answering the exact same
 * questions, never independently-generated ones.
 */
/**
 * Returns null (never a partially-broken row) when no visual content
 * could be generated at all today -- this is a full outage of every
 * visual kind for this game type, rare enough that it isn't worth
 * caching a bad result: the next request just tries generation again
 * from scratch instead of being stuck with today's failure until
 * midnight.
 */
export async function getOrCreateTodayRun(spaceId: string, gameType: RunGameType): Promise<GameRunRow | null> {
  const runDate = await getTodayRunDateForSpace(spaceId);
  let existing = await getExistingRun(spaceId, gameType, runDate);
  if (existing) {
    // Guards against a run saved by an earlier, buggier deploy (or any
    // other cause) with fewer than the required number of questions --
    // "EXACTLY 5 or no run" applies to what's persisted, not just to
    // new generation. Only discard and regenerate if nobody has
    // touched it yet: once a player has an answer row (even an
    // in-progress one), their progress is only meaningful against the
    // exact item set they were shown, so a short-but-answered run is
    // left alone as legacy rather than mutated destructively.
    if ((gameType === "this_or_that" || gameType === "guess_mine") && (existing.questions as unknown[]).length < 5) {
      const supabase = await createClient();
      const { count } = await supabase.from("game_run_answers").select("id", { count: "exact", head: true }).eq("run_id", existing.id);
      if (!count) {
        console.log("[play/daily-run]", JSON.stringify({ runId: existing.id, spaceId, gameType, runDate, outcome: "discarding_partial_unanswered_run" }));
        await supabase.from("game_runs").delete().eq("id", existing.id);
        existing = null;
      }
    }
  }
  if (existing) return existing;

  const genStart = Date.now();
  const generated = await generateQuestions(gameType, spaceId);
  const generationMs = Date.now() - genStart;
  if (!generated) {
    console.log("[play/daily-run]", JSON.stringify({ spaceId, gameType, runDate, generationMs, outcome: "no_visual_content_available" }));
    return null;
  }
  const { questions, topic, category } = generated;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_runs")
    .insert({ space_id: spaceId, game_type: gameType, run_date: runDate, topic, category, questions: questions as Json })
    .select()
    .single();

  if (error) {
    // 23505 = unique_violation -- the partner's request created it a
    // moment ago. Fall through to reading their row rather than erroring.
    if (error.code === "23505") {
      const raced = await getExistingRun(spaceId, gameType, runDate);
      if (raced) return raced;
    }
    throw error;
  }

  console.log(
    "[play/daily-run]",
    JSON.stringify({
      runId: data.id,
      spaceId,
      gameType,
      runDate,
      questionCount: questions.length,
      generationMs,
      items: summarizeGeneratedQuestions(gameType, questions),
    })
  );

  return data;
}

/** Have BOTH space members completed this run? Used to decide whether
 * to show the comparison immediately or "results when partner
 * finishes." */
export async function getBothAnswers(
  runId: string,
  userId: string,
  otherUserId: string | null
): Promise<{ mine: GameRunAnswerRow | null; theirs: GameRunAnswerRow | null }> {
  const supabase = await createClient();
  const ids = [userId, ...(otherUserId ? [otherUserId] : [])];
  const { data } = await supabase.from("game_run_answers").select("*").eq("run_id", runId).in("user_id", ids);
  const rows = data ?? [];
  return {
    mine: rows.find((r) => r.user_id === userId) ?? null,
    theirs: otherUserId ? (rows.find((r) => r.user_id === otherUserId) ?? null) : null,
  };
}

/** Which of the 5 daily-run game types has THIS player already
 * completed today -- powers the Play hub's "Played today" badge. Two
 * queries total regardless of how many game types exist (today's runs,
 * then this player's completed answers among them), not one per game
 * card. */
export async function getCompletedRunGameTypesToday(spaceId: string, userId: string): Promise<Set<RunGameType>> {
  const supabase = await createClient();
  const runDate = await getTodayRunDateForSpace(spaceId);
  const { data: runs } = await supabase
    .from("game_runs")
    .select("id, game_type")
    .eq("space_id", spaceId)
    .eq("run_date", runDate)
    .in("game_type", RUN_GAME_TYPES);
  if (!runs || runs.length === 0) return new Set();

  const { data: answers } = await supabase
    .from("game_run_answers")
    .select("run_id")
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .in(
      "run_id",
      runs.map((r) => r.id)
    );
  const completedRunIds = new Set((answers ?? []).map((a) => a.run_id));
  return new Set(runs.filter((r) => completedRunIds.has(r.id)).map((r) => r.game_type as RunGameType));
}

export { requiredAnswerCount };

export type RunStartPayload = {
  run: GameRunRow | null;
  mine: GameRunAnswerRow | null;
  requiredAnswerCount: number;
  partner: { id: string; display_name: string } | null;
  theirsCompleted: boolean;
  result: RunResult | null;
};

/** Shared by the server-rendered page (first load -- no client round
 * trip needed) and /api/play/run/start (used for any client-side
 * re-check) so both compute today's-run state identically.
 *
 * `run` is null only when no visual content could be generated at all
 * today (every provider/kind failed) -- the page renders an honest
 * "not available right now" state rather than a text-only round. */
export async function buildRunStartPayload(spaceId: string, gameType: RunGameType, userId: string): Promise<RunStartPayload> {
  const supabase = await createClient();
  const [{ data: membership }, run] = await Promise.all([
    supabase.from("space_members").select("user_id, profiles(id, display_name)").eq("space_id", spaceId),
    getOrCreateTodayRun(spaceId, gameType),
  ]);

  const partner =
    (membership ?? []).map((m) => m.profiles as unknown as { id: string; display_name: string } | null).find((p) => p && p.id !== userId) ?? null;

  const required = requiredAnswerCount(gameType);
  if (!run) {
    return { run: null, mine: null, requiredAnswerCount: required, partner, theirsCompleted: false, result: null };
  }

  const [mine, theirs] = await Promise.all([
    getRunAnswer(run.id, userId),
    partner ? getRunAnswer(run.id, partner.id) : Promise.resolve(null),
  ]);

  const bothComplete = !!mine?.completed_at && !!theirs?.completed_at;
  const result = bothComplete ? computeRunResult(gameType, (mine!.answers as unknown[]) ?? [], (theirs!.answers as unknown[]) ?? []) : null;

  return { run, mine, requiredAnswerCount: required, partner, theirsCompleted: !!theirs?.completed_at, result };
}
