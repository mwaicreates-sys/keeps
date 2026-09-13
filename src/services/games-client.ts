"use client";

import { createClient } from "@/lib/supabase/client";
import { notify } from "@/services/notify-client";
import type { Json } from "@/lib/types";

export type GameType =
  | "this_or_that"
  | "top5"
  | "blind_rank"
  | "match_predictions"
  | "guess_mine"
  | "keep3_drop2";

export async function createGameSession(input: {
  spaceId: string;
  createdBy: string;
  otherMemberId: string | null;
  gameType: GameType;
  topic: string;
  category?: string;
  prompt: Record<string, unknown>;
}) {
  const start = performance.now();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .insert({
      space_id: input.spaceId,
      game_type: input.gameType,
      topic: input.topic,
      category: input.category || null,
      prompt: input.prompt as Json,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  console.log("[perf] session_creation", { gameType: input.gameType, ms: Math.round(performance.now() - start) });

  // Fire-and-forget: the partner's notification doesn't need to block
  // this player's navigation into the new round -- per the perf pass,
  // "New round" should feel instant, not wait on a second DB write.
  if (input.otherMemberId) {
    void notify({
      spaceId: input.spaceId,
      userId: input.otherMemberId,
      type: "game_invite",
      category: "play",
      title: `New ${gameLabel(input.gameType)} challenge`,
      body: input.topic,
      data: { sessionId: data.id, gameType: input.gameType },
    });
  }

  return data;
}

/** Persists a swapped-in round ("Don't know this?") to the session row
 * itself, not just local state -- so a partner opening the same
 * session (or a page refresh) sees the swap too, instead of the two
 * sides silently diverging on what the round even was. Any space
 * member may call this (same RLS as the rest of game_sessions), and
 * it's only ever used pre-answer. */
export async function updateGameSessionPrompt(input: {
  sessionId: string;
  prompt: Record<string, unknown>;
  topic?: string;
  category?: string;
}) {
  const supabase = createClient();
  const update: { prompt: Json; topic?: string; category?: string } = { prompt: input.prompt as Json };
  if (input.topic !== undefined) update.topic = input.topic;
  if (input.category !== undefined) update.category = input.category;
  const { error } = await supabase.from("game_sessions").update(update).eq("id", input.sessionId);
  if (error) throw error;
}

export function gameLabel(type: GameType): string {
  switch (type) {
    case "this_or_that":
      return "This or That";
    case "top5":
      return "My Top 5";
    case "blind_rank":
      return "Blind Rank";
    case "match_predictions":
      return "Match Predictions";
    case "guess_mine":
      return "Guess Mine";
    case "keep3_drop2":
      return "Keep 3, Drop 2";
  }
}

export async function submitGameAnswer(input: {
  sessionId: string;
  userId: string;
  answer: Record<string, unknown>;
  spaceId: string;
  otherMemberId: string | null;
  gameType: GameType;
  topic: string;
}) {
  const start = performance.now();
  const supabase = createClient();
  const { error } = await supabase
    .from("game_answers")
    .upsert(
      { session_id: input.sessionId, user_id: input.userId, answer: input.answer as Json },
      { onConflict: "session_id,user_id" }
    );
  if (error) throw error;
  const answerSubmitMs = Math.round(performance.now() - start);

  const { data: answers } = await supabase
    .from("game_answers")
    .select("*")
    .eq("session_id", input.sessionId);

  // Both answers are in: compute and store the result in this same
  // request (never waiting for the reveal screen to open and fetch/
  // compute it separately) -- pure local logic, no provider calls.
  if (answers && answers.length >= 2) {
    const resultStart = performance.now();
    const result = computeResult(input.gameType, answers as { user_id: string; answer: unknown }[]);
    await supabase
      .from("game_results")
      .upsert({ session_id: input.sessionId, result: result as Json }, { onConflict: "session_id" });
    // Fire-and-forget: the session's status column is display-only
    // (history list badge) and the notification is for the *other*
    // player -- neither needs to block this player's own reveal.
    void supabase.from("game_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", input.sessionId);
    if (input.otherMemberId) {
      void notify({
        spaceId: input.spaceId,
        userId: input.otherMemberId,
        type: "game_ready",
        category: "play",
        title: `${gameLabel(input.gameType)} ready to compare`,
        body: input.topic,
        data: { sessionId: input.sessionId, gameType: input.gameType },
      });
    }
    console.log("[perf] answer_submission", {
      gameType: input.gameType,
      answerSubmitMs,
      resultComputeMs: Math.round(performance.now() - resultStart),
      final: true,
    });
  } else {
    console.log("[perf] answer_submission", { gameType: input.gameType, answerSubmitMs, final: false });
    if (input.otherMemberId) {
      void supabase.from("game_sessions").update({ status: "ready" }).eq("id", input.sessionId);
      void notify({
        spaceId: input.spaceId,
        userId: input.otherMemberId,
        type: "game_answer",
        category: "play",
        title: `Your turn: ${gameLabel(input.gameType)}`,
        body: input.topic,
        data: { sessionId: input.sessionId, gameType: input.gameType },
      });
    }
  }
}

type AnswerRow = { user_id: string; answer: unknown };

/** Pure comparison logic — kept separate from I/O so it's easy to reason about. */
export function computeResult(gameType: GameType, answers: AnswerRow[]): Record<string, unknown> {
  const [a, b] = answers;
  if (!a || !b) return {};

  switch (gameType) {
    case "this_or_that":
    case "guess_mine": {
      const aChoice = (a.answer as { choice: string }).choice;
      const bChoice = (b.answer as { choice: string }).choice;
      return {
        [a.user_id]: aChoice,
        [b.user_id]: bChoice,
        matched: aChoice === bChoice,
      };
    }
    case "top5": {
      const aItems = (a.answer as { items: string[] }).items.map((s) => s.toLowerCase().trim());
      const bItems = (b.answer as { items: string[] }).items.map((s) => s.toLowerCase().trim());
      const samePosition = aItems.filter((item, i) => bItems[i] === item).length;
      const shared = aItems.filter((item) => bItems.includes(item));
      const overlapPct = Math.round((shared.length / 5) * 100);
      return {
        [a.user_id]: (a.answer as { items: string[] }).items,
        [b.user_id]: (b.answer as { items: string[] }).items,
        sharedItems: shared,
        samePosition,
        overlapPct,
      };
    }
    case "blind_rank": {
      const aRank = (a.answer as { ranking: Record<string, number> }).ranking;
      const bRank = (b.answer as { ranking: Record<string, number> }).ranking;
      const matches = Object.keys(aRank).filter((k) => aRank[k] === bRank[k]).length;
      return {
        [a.user_id]: aRank,
        [b.user_id]: bRank,
        matches,
      };
    }
    case "keep3_drop2": {
      const aKept: string[] = (a.answer as { kept: string[] }).kept;
      const bKept: string[] = (b.answer as { kept: string[] }).kept;
      const overlap = aKept.filter((x) => bKept.includes(x));
      return {
        [a.user_id]: aKept,
        [b.user_id]: bKept,
        overlap,
        overlapCount: overlap.length,
      };
    }
    default:
      return {};
  }
}
