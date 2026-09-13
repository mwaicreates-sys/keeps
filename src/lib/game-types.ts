import type { Tables } from "@/lib/types";

/**
 * A game_sessions row plus just enough of its related tables to render a
 * history list and a completed result — `game_answers` only carries
 * `user_id` (who has answered, not what), `game_results.result` carries
 * the already-computed comparison (see computeResult in games-client.ts).
 * `game_results` is a to-one relationship (its own primary key is
 * session_id), so PostgREST embeds it as a single object or null, never
 * an array.
 */
export type GameSessionRow = Tables<"game_sessions"> & {
  game_answers: { user_id: string }[];
  game_results: { result: Record<string, unknown> } | null;
};

export type FixtureRow = Tables<"match_fixtures"> & {
  match_predictions: Tables<"match_predictions">[];
};

export function sessionStatus(session: GameSessionRow, userId: string): "completed" | "waiting" | "your_turn" {
  if (session.game_results) return "completed";
  const answeredByMe = session.game_answers.some((a) => a.user_id === userId);
  return answeredByMe ? "waiting" : "your_turn";
}

export function fixtureStatus(fixture: FixtureRow, userId: string): "completed" | "waiting" | "your_turn" {
  if (fixture.result) return "completed";
  const predictedByMe = fixture.match_predictions.some((p) => p.user_id === userId);
  return predictedByMe ? "waiting" : "your_turn";
}
