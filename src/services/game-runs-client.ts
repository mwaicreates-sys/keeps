"use client";

import type { RunGameType } from "@/lib/game-run-types";
import type { RunResult } from "@/lib/game-run-result";
import type { Json } from "@/lib/types";

export type RunStartResponse = {
  run: { id: string; game_type: string; run_date: string; topic: string | null; category: string | null; questions: Json };
  mine: { id: string; answers: Json; completed_at: string | null } | null;
  requiredAnswerCount: number;
  partner: { id: string; display_name: string } | null;
  theirsCompleted: boolean;
  result: RunResult | null;
};

/** Gets (or, on the first open of the day, creates) today's run for
 * this game type -- the single entry point every base route calls, so
 * a refresh/new tab/reopen always lands on the same in-progress run
 * instead of generating another one. */
export async function startTodayRun(spaceId: string, gameType: RunGameType): Promise<RunStartResponse> {
  const res = await fetch("/api/play/run/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spaceId, gameType }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Couldn't load today's run.");
  return body as RunStartResponse;
}

export type RunAnswerResponse = {
  answer: { id: string; answers: unknown[]; completed_at: string | null };
  completed: boolean;
  result: RunResult | null;
};

/** Submits one answer -- one of 5 sequential choices, or the single
 * whole-run action for the single-action games. Always appended
 * server-side to whatever's already been answered today; the caller
 * never has to (and can't) specify a position. */
export async function submitRunAnswer(runId: string, value: unknown): Promise<RunAnswerResponse> {
  const res = await fetch("/api/play/run/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId, value }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Couldn't save your answer.");
  return body as RunAnswerResponse;
}

export type RunSwapResponse = {
  run: { id: string; game_type: string; run_date: string; topic: string | null; category: string | null; questions: Json };
  regenerated: boolean;
};

/** "Don't know this?" -- a safety valve, not a second daily allowance:
 * replaces one unfamiliar item in today's already-generated run,
 * in place, without ever creating a new run or counting as an answer.
 * Throws with a recognizable message if the partner has already
 * completed the run (their answer is locked against the current item
 * set) or there's nothing left to swap (the hardcoded-pack fallback
 * has no real ids). */
export async function swapRunItem(
  input:
    | { runId: string; kind: "choice"; index: number; side: "A" | "B" }
    | { runId: string; kind: "blind_rank" | "keep3_drop2"; item: string }
): Promise<RunSwapResponse> {
  const res = await fetch("/api/play/run/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Couldn't swap this item.");
  if (!body.run) throw new Error("No replacement available right now.");
  return body as RunSwapResponse;
}
