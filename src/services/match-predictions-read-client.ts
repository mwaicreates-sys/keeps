"use client";

import { createClient } from "@/lib/supabase/client";

export async function listFixtures(spaceId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("match_fixtures")
    .select("*, match_predictions(*)")
    .eq("space_id", spaceId)
    .order("kickoff_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
