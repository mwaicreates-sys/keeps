/** The 5 game types that use the daily-run model (Match Predictions
 * deliberately excluded -- it follows real fixtures, not a fabricated
 * daily 5, per the product decision). Shared, framework-agnostic type
 * so both server and client modules can import it without pulling in
 * "use client" code. */
export type RunGameType = "this_or_that" | "guess_mine" | "blind_rank" | "keep3_drop2" | "top5";

export const RUN_GAME_TYPES: RunGameType[] = ["this_or_that", "guess_mine", "blind_rank", "keep3_drop2", "top5"];

/** How many answers make up one complete daily run for this game type.
 * This or That/Guess Mine are 5 separate, sequential questions; Blind
 * Rank/Keep 3 Drop 2/Top 5 are each a single action that already
 * covers all 5 items in one submission -- so "complete" for those is
 * 1 answer, not 5. See the product decision: "the limit is five
 * QUESTIONS/choices in the daily run, not five separately-created
 * game sessions." */
export function requiredAnswerCount(gameType: RunGameType): number {
  return gameType === "this_or_that" || gameType === "guess_mine" ? 5 : 1;
}

export function isRunGameType(gameType: string): gameType is RunGameType {
  return RUN_GAME_TYPES.includes(gameType as RunGameType);
}
