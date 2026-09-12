"use client";

import { createClient } from "@/lib/supabase/client";
import { notify } from "@/services/notify-client";

export async function createFixture(input: {
  spaceId: string;
  createdBy: string;
  otherMemberId: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("match_fixtures")
    .insert({
      space_id: input.spaceId,
      home_team: input.homeTeam,
      away_team: input.awayTeam,
      kickoff_at: input.kickoffAt,
      source: "manual",
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.otherMemberId) {
    await notify({
      spaceId: input.spaceId,
      userId: input.otherMemberId,
      type: "game_invite",
      category: "play",
      title: "New match to predict",
      body: `${input.homeTeam} vs ${input.awayTeam}`,
      data: { fixtureId: data.id },
    });
  }
  return data;
}

export async function submitPrediction(input: {
  fixtureId: string;
  userId: string;
  winnerPick: "home" | "draw" | "away";
  overUnder?: "over" | "under";
  btts?: "yes" | "no";
  spaceId: string;
  otherMemberId: string | null;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("match_predictions").upsert(
    {
      fixture_id: input.fixtureId,
      user_id: input.userId,
      winner_pick: input.winnerPick,
      over_under: input.overUnder,
      btts: input.btts,
    },
    { onConflict: "fixture_id,user_id" }
  );
  if (error) throw error;

  if (input.otherMemberId) {
    await notify({
      spaceId: input.spaceId,
      userId: input.otherMemberId,
      type: "game_answer",
      category: "play",
      title: "Prediction submitted",
      data: { fixtureId: input.fixtureId },
    });
  }
}

/** Manually record a settled result (no paid football API required). */
export async function settleFixture(fixtureId: string, homeGoals: number, awayGoals: number, spaceId: string) {
  const supabase = createClient();
  const result = { homeGoals, awayGoals };
  await supabase.from("match_fixtures").update({ result }).eq("id", fixtureId);

  const { data: preds } = await supabase
    .from("match_predictions")
    .select("user_id")
    .eq("fixture_id", fixtureId);

  for (const p of preds ?? []) {
    await notify({
      spaceId,
      userId: p.user_id,
      type: "prediction_settled",
      category: "play",
      title: "Match result is in",
      body: `${homeGoals} - ${awayGoals}`,
      data: { fixtureId },
    });
  }
}
