import { createClient } from "@/lib/supabase/server";
import { resolveTimeZone, localDateString } from "@/lib/timezone";
import { pickChoicePrompt, type ChoicePrompt } from "@/lib/choice-prompt";
import { pickBlindRankPrompt } from "@/lib/blind-rank-prompt";
import { pickKeepDropPrompt } from "@/lib/keep-drop-prompt";
import { pickTop5Prompt } from "@/lib/top5-prompt";
import { requiredAnswerCount, RUN_GAME_TYPES, type RunGameType } from "@/lib/game-run-types";
import { computeRunResult, type RunResult } from "@/lib/game-run-result";
import type { Tables, Json } from "@/lib/types";

export type GameRunRow = Tables<"game_runs">;
export type GameRunAnswerRow = Tables<"game_run_answers">;

export async function getUserTimezone(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle();
  return resolveTimeZone(data?.timezone ?? null);
}

/** This player's local calendar date, "YYYY-MM-DD" -- the run_date a
 * new run is stamped with, and the key used to find today's existing
 * one. Per the product rule, this follows the player's own local day,
 * never a hardcoded region and never UTC pretending to be everyone's
 * day. */
export async function getTodayRunDateForUser(userId: string): Promise<string> {
  const tz = await getUserTimezone(userId);
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
 * second, independently-generated one (see createTodayRun below). */
async function generateQuestions(gameType: RunGameType, spaceId: string): Promise<{ questions: unknown[]; topic: string; category: string }> {
  if (gameType === "this_or_that" || gameType === "guess_mine") {
    const questions: ChoicePrompt[] = [];
    const usedIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const q = await pickChoicePrompt(gameType, spaceId, usedIds.length ? usedIds : undefined);
      questions.push(q);
      if (q.items) usedIds.push(...q.items.map((it) => it.id));
    }
    return { questions, topic: "Today's 5", category: questions[0]?.category ?? "Mixed" };
  }
  if (gameType === "blind_rank") {
    const { prompt, topic } = await pickBlindRankPrompt(spaceId);
    return { questions: [prompt], topic, category: prompt.category };
  }
  if (gameType === "keep3_drop2") {
    const { prompt, topic } = await pickKeepDropPrompt(spaceId);
    return { questions: [prompt], topic, category: prompt.category };
  }
  // top5
  const p = await pickTop5Prompt();
  return { questions: [p], topic: p.topic, category: p.category };
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
export async function getOrCreateTodayRun(spaceId: string, gameType: RunGameType, userId: string): Promise<GameRunRow> {
  const runDate = await getTodayRunDateForUser(userId);
  const existing = await getExistingRun(spaceId, gameType, runDate);
  if (existing) return existing;

  const { questions, topic, category } = await generateQuestions(gameType, spaceId);
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
  const runDate = await getTodayRunDateForUser(userId);
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
    getOrCreateTodayRun(spaceId, gameType, userId),
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
