import type { RunGameType } from "@/lib/game-run-types";

/**
 * Pure comparison logic for a completed daily run -- both players'
 * `answers` arrays (index-aligned with the run's stored `questions`)
 * go in, a game-type-shaped result comes out. No I/O, no provider
 * calls: exactly the "no provider calls on the result screen" rule --
 * everything needed to render results already lives in the row.
 *
 * Mirrors the equivalent branches of games-client.ts's computeResult,
 * adapted from "one session, one answer" to "one run, N answers."
 */
export type ChoiceAnswer = { choice: string };
export type BlindRankAnswer = { ranking: Record<string, number> };
export type KeepDropAnswer = { kept: string[] };
export type Top5Answer = { items: string[] };

export type PerQuestionResult = { index: number; mine: string; theirs: string; matched: boolean };

export type RunResult =
  | { kind: "choice"; perQuestion: PerQuestionResult[]; matchedCount: number; total: number }
  | { kind: "blind_rank"; mine: Record<string, number>; theirs: Record<string, number>; matches: number }
  | { kind: "keep3_drop2"; mine: string[]; theirs: string[]; overlap: string[]; overlapCount: number }
  | { kind: "top5"; mine: string[]; theirs: string[]; sharedItems: string[]; samePosition: number; overlapPct: number };

export function computeRunResult(gameType: RunGameType, mine: unknown[], theirs: unknown[]): RunResult | null {
  if (gameType === "this_or_that" || gameType === "guess_mine") {
    const my = mine as ChoiceAnswer[];
    const their = theirs as ChoiceAnswer[];
    const total = Math.min(my.length, their.length);
    if (total === 0) return null;
    const perQuestion: PerQuestionResult[] = [];
    let matchedCount = 0;
    for (let i = 0; i < total; i++) {
      const matched = my[i]?.choice === their[i]?.choice;
      if (matched) matchedCount++;
      perQuestion.push({ index: i, mine: my[i]?.choice, theirs: their[i]?.choice, matched });
    }
    return { kind: "choice", perQuestion, matchedCount, total };
  }

  if (gameType === "blind_rank") {
    const my = (mine[0] as BlindRankAnswer | undefined)?.ranking ?? {};
    const their = (theirs[0] as BlindRankAnswer | undefined)?.ranking ?? {};
    const matches = Object.keys(my).filter((k) => my[k] === their[k]).length;
    return { kind: "blind_rank", mine: my, theirs: their, matches };
  }

  if (gameType === "keep3_drop2") {
    const my = (mine[0] as KeepDropAnswer | undefined)?.kept ?? [];
    const their = (theirs[0] as KeepDropAnswer | undefined)?.kept ?? [];
    const overlap = my.filter((x) => their.includes(x));
    return { kind: "keep3_drop2", mine: my, theirs: their, overlap, overlapCount: overlap.length };
  }

  // top5
  const my = (mine[0] as Top5Answer | undefined)?.items ?? [];
  const their = (theirs[0] as Top5Answer | undefined)?.items ?? [];
  const myNorm = my.map((s) => s.toLowerCase().trim());
  const theirNorm = their.map((s) => s.toLowerCase().trim());
  const samePosition = myNorm.filter((item, i) => theirNorm[i] === item).length;
  const sharedItems = my.filter((item) => theirNorm.includes(item.toLowerCase().trim()));
  const overlapPct = my.length ? Math.round((sharedItems.length / my.length) * 100) : 0;
  return { kind: "top5", mine: my, theirs: their, sharedItems, samePosition, overlapPct };
}
