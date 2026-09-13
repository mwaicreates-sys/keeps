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

/** Single-fixture read for the gameplay screen -- re-used both after
 * submitting a prediction/result and by the "waiting on partner"
 * polling loop. A plain DB read only, never provider content. */
export async function getFixture(fixtureId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("match_fixtures")
    .select("*, match_predictions(*)")
    .eq("id", fixtureId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
