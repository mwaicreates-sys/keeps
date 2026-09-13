import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRunAnswer } from "@/services/game-runs-server";
import { isRunGameType, requiredAnswerCount } from "@/lib/game-run-types";
import { computeRunResult } from "@/lib/game-run-result";
import type { Json } from "@/lib/types";

const GAME_LABEL: Record<string, string> = {
  this_or_that: "This or That",
  guess_mine: "Guess Mine",
  blind_rank: "Blind Rank",
  keep3_drop2: "Keep 3, Drop 2",
  top5: "My Top 5",
};

/**
 * Submits exactly one answer into today's run -- one of 5 sequential
 * choices for This or That/Guess Mine, or the single whole-run action
 * for Blind Rank/Keep 3 Drop 2/Top 5. Always appends to whatever this
 * player has already answered today (never trusts a client-supplied
 * position), so a duplicate/replayed request can't overwrite or skip
 * an answer.
 *
 * When this submission is the one that completes the run AND the
 * partner had already completed theirs earlier, this is the "later"
 * finisher -- comparison is returned inline for them, and a
 * notification is created for the partner (who's been waiting) so
 * they find out results are ready without having to reopen the game
 * speculatively.
 *
 * Requires the client to present the `questionsVersion` its copy of
 * `run.questions` matches (returned by /api/play/run/start and by
 * every prior answer/swap response). A swap bumps that version -- if
 * it doesn't match the run's *current* version, this player's local
 * question set is stale (a swap happened after they loaded it) and
 * the answer is refused rather than silently recorded against content
 * they never actually saw. This is the server-side guarantee behind
 * "the comparison must never compare an old option set against a new
 * one": every recorded answer is provably against the run's current
 * questions at the moment it was submitted.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { runId?: string; value?: unknown; questionsVersion?: number } | null;
  if (!body?.runId || body.value === undefined || typeof body.questionsVersion !== "number") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { data: run } = await supabase.from("game_runs").select("*").eq("id", body.runId).maybeSingle();
  if (!run || !isRunGameType(run.game_type)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (run.questions_version !== body.questionsVersion) {
    return NextResponse.json({ error: "stale_run", currentVersion: run.questions_version }, { status: 409 });
  }
  const gameType = run.game_type;
  const required = requiredAnswerCount(gameType);

  const existing = await getRunAnswer(run.id, user.id);
  const priorAnswers = (existing?.answers as unknown[]) ?? [];

  // Idempotent: a duplicate/replayed submit once already complete just
  // returns the existing state instead of appending past the required
  // count.
  if (existing?.completed_at || priorAnswers.length >= required) {
    return NextResponse.json({ answer: existing, completed: true });
  }

  const answers = [...priorAnswers, body.value];
  const completedNow = answers.length >= required;
  const { data: saved, error } = await supabase
    .from("game_run_answers")
    .upsert(
      {
        run_id: run.id,
        user_id: user.id,
        answers: answers as Json,
        completed_at: completedNow ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "run_id,user_id" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let result = null;
  if (completedNow) {
    const { data: membership } = await supabase.from("space_members").select("user_id").eq("space_id", run.space_id);
    const partnerId = (membership ?? []).map((m) => m.user_id).find((id) => id !== user.id) ?? null;
    if (partnerId) {
      const partnerAnswer = await getRunAnswer(run.id, partnerId);
      if (partnerAnswer?.completed_at) {
        result = computeRunResult(gameType, answers, (partnerAnswer.answers as unknown[]) ?? []);
        const { data: me } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
        void supabase.from("notifications").insert({
          space_id: run.space_id,
          user_id: partnerId,
          type: "game_ready",
          category: "play",
          title: `${me?.display_name ?? "Your partner"} finished ${GAME_LABEL[gameType] ?? gameType}`,
          body: "See how you matched.",
          data: { gameType, runId: run.id } as Json,
        });
      }
    }
  }

  return NextResponse.json({ answer: saved, completed: completedNow, result });
}
