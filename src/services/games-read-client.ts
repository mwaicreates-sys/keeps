"use client";

import { createClient } from "@/lib/supabase/client";
import type { GameType } from "@/services/games-client";

export async function listGameSessions(spaceId: string, gameType: GameType) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*, game_answers(user_id), game_results(result)")
    .eq("space_id", spaceId)
    .eq("game_type", gameType)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getGameSession(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*, game_answers(*), game_results(result)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
