import { createClient } from "@/lib/supabase/server";
import type { GameType } from "@/services/games-client";
import type { GameSessionRow, FixtureRow } from "@/lib/game-types";

/** Server-side counterpart to games-read-client.ts's listGameSessions, for
 * each game page's initial server-rendered load. */
export async function getGameSessions(spaceId: string, gameType: GameType): Promise<GameSessionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*, game_answers(user_id), game_results(result)")
    .eq("space_id", spaceId)
    .eq("game_type", gameType)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as unknown as GameSessionRow[];
}

/** Server-side counterpart to games-read-client.ts's getGameSession, for
 * the dedicated per-round gameplay route (/play/<game>/[sessionId]). */
export async function getGameSession(id: string): Promise<GameSessionRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*, game_answers(*), game_results(result)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as GameSessionRow | null;
}

/** Server-side counterpart to match-predictions-read-client.ts's listFixtures. */
export async function getMatchFixtures(spaceId: string): Promise<FixtureRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_fixtures")
    .select("*, match_predictions(*)")
    .eq("space_id", spaceId)
    .order("kickoff_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as unknown as FixtureRow[];
}
