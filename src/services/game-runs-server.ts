import { createClient } from "@/lib/supabase/server";
import { resolveTimeZone, localDateString } from "@/lib/timezone";
import { generateChoiceQuestion, generateBlindRankQuestion, generateKeepDropQuestion } from "@/lib/run-content-generator";
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
 * same provider engine (MusicBrainz/TMDb via content-pool-server.ts),
 * the exact same overfetch-and-require-images validation, and the
 * exact same hardcoded-pack last resort -- just invoked in a way that
 * actually runs on the server instead of silently no-op'ing. */
async function generateQuestions(gameType: RunGameType, spaceId: string): Promise<{ questions: unknown[]; topic: string; category: string }> {
  if (gameType === "this_or_that" || gameType === "guess_mine") {
    const questions: ChoicePrompt[] = [];
    const usedIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const q = await generateChoiceQuestion(gameType, spaceId, usedIds);
      questions.push(q);
      if (q.items) usedIds.push(...q.items.map((it) => it.id));
    }
    return { questions, topic: "Today's 5", category: questions[0]?.category ?? "Mixed" };
  }
  if (gameType === "blind_rank") {
    const { prompt, topic } = await generateBlindRankQuestion(spaceId);
    return { questions: [prompt], topic, category: prompt.category };
  }
  if (gameType === "keep3_drop2") {
    const { prompt, topic } = await generateKeepDropQuestion(spaceId);
    return { questions: [prompt], topic, category: prompt.category };
  }
  // top5 -- a plain random topic from the hardcoded pack, no provider
  // involved at all (unchanged from before; there's nothing here that
  // could have hit the same server/client bug).
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
export async function getOrCreateTodayRun(spaceId: string, gameType: RunGameType): Promise<GameRunRow> {
  const runDate = await getTodayRunDateForSpace(spaceId);
  const existing = await getExistingRun(spaceId, gameType, runDate);
  if (existing) return existing;

  const genStart = Date.now();
  const { questions, topic, category } = await generateQuestions(gameType, spaceId);
  const generationMs = Date.now() - genStart;
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
  run: GameRunRow;
  mine: GameRunAnswerRow | null;
  requiredAnswerCount: number;
  partner: { id: string; display_name: string } | null;
  theirsCompleted: boolean;
  result: RunResult | null;
};

/** Shared by the server-rendered page (first load -- no client round
 * trip needed) and /api/play/run/start (used for any client-side
 * re-check) so both compute today's-run state identically. */
export async function buildRunStartPayload(spaceId: string, gameType: RunGameType, userId: string): Promise<RunStartPayload> {
  const supabase = await createClient();
  const [{ data: membership }, run] = await Promise.all([
    supabase.from("space_members").select("user_id, profiles(id, display_name)").eq("space_id", spaceId),
    getOrCreateTodayRun(spaceId, gameType),
  ]);

  const partner =
    (membership ?? []).map((m) => m.profiles as unknown as { id: string; display_name: string } | null).find((p) => p && p.id !== userId) ?? null;

  const [mine, theirs] = await Promise.all([
    getRunAnswer(run.id, userId),
    partner ? getRunAnswer(run.id, partner.id) : Promise.resolve(null),
  ]);

  const required = requiredAnswerCount(gameType);
  const bothComplete = !!mine?.completed_at && !!theirs?.completed_at;
  const result = bothComplete ? computeRunResult(gameType, (mine!.answers as unknown[]) ?? [], (theirs!.answers as unknown[]) ?? []) : null;

  return { run, mine, requiredAnswerCount: required, partner, theirsCompleted: !!theirs?.completed_at, result };
}
