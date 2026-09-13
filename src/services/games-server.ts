import { createClient } from "@/lib/supabase/server";
import type { GameType } from "@/services/games-client";
import { sessionStatus, type GameSessionRow, type FixtureRow } from "@/lib/game-types";

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
 * just gives the round screen a sense of progress.
 *
 * @deprecated superseded by getDailyPlayCount, which reflects the real
 * daily cap (per user, per game type) instead of an all-time, both-
 * players cycling count. Kept only until every call site is confirmed
 * migrated; do not add new callers. */
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

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Real daily-cap counter: how many sessions of this game type has this
 * specific user *started* today (UTC calendar day)? Used both to render
 * "N of 5"/"Done for today" and, server-side in /api/play/session, as
 * the actual gate on creating a new one -- the same function backs both
 * the display and the enforcement, so they can't drift apart.
 *
 * Day boundary is UTC rather than the player's local timezone: simple,
 * unambiguous, and consistent regardless of which device/timezone either
 * space member is in. `upToCreatedAt` restricts the count to sessions at
 * or before that moment (used to show "this session was your Nth today"
 * on an already-created round, as opposed to "how many have I made
 * *before* creating another").
 */
export async function getDailyPlayCount(spaceId: string, gameType: GameType, userId: string, upToCreatedAt?: string): Promise<number> {
  const supabase = await createClient();
  const reference = upToCreatedAt ? new Date(upToCreatedAt) : new Date();
  const dayStart = startOfUtcDay(reference).toISOString();
  let query = supabase
    .from("game_sessions")
    .select("id", { count: "exact", head: true })
    .eq("space_id", spaceId)
    .eq("game_type", gameType)
    .eq("created_by", userId)
    .gte("created_at", dayStart);
  if (upToCreatedAt) query = query.lte("created_at", upToCreatedAt);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
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

/** Server-side single-fixture fetch for /play/match-predictions/[fixtureId]. */
export async function getMatchFixture(id: string): Promise<FixtureRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("match_fixtures").select("*, match_predictions(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as FixtureRow | null;
}

/**
 * The most recent session of this game type that still needs the
 * current user's answer -- used by each game's base route (now a
 * launcher, not a history list) to resume in place of starting a
 * redundant new round. Returns null when there's nothing to resume,
 * in which case the launcher starts a fresh round instead.
 */
export async function getResumableSession(spaceId: string, gameType: GameType, userId: string): Promise<GameSessionRow | null> {
  const sessions = await getGameSessions(spaceId, gameType);
  return sessions.find((s) => sessionStatus(s, userId) === "your_turn") ?? null;
}

/**
 * Match Predictions' equivalent of getResumableSession: prefers a
 * fixture the current user hasn't predicted yet; otherwise the most
 * recent fixture at all (so a player checking in sees where things
 * stand -- waiting on partner, or a settled result -- instead of
 * nothing). Returns null only when the space has no fixtures yet, in
 * which case the launcher falls back to its own lightweight "add a
 * fixture" entry (there's no auto-generatable sports content here).
 */
export async function getResumableFixture(spaceId: string, userId: string): Promise<FixtureRow | null> {
  const fixtures = await getMatchFixtures(spaceId);
  const needsMe = fixtures.find((f) => !f.result && !f.match_predictions.some((p) => p.user_id === userId));
  return needsMe ?? fixtures[0] ?? null;
}
