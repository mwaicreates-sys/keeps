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

/** Purely cosmetic "N of 10" round counter for the active-gameplay
 * header -- counts how many sessions of this game type existed at or
 * before this one (by created_at) and cycles 1-10. Never gates anything;
 * just gives the round screen a sense of progress. */
export async function getGameSessionRoundNumber(spaceId: string, gameType: GameType, createdAt: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("game_sessions")
    .select("id", { count: "exact", head: true })
    .eq("space_id", spaceId)
    .eq("game_type", gameType)
    .lte("created_at", createdAt);
  if (error) throw error;
  const total = count ?? 1;
  return ((total - 1) % 10) + 1;
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
