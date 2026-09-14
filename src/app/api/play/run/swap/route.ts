import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRunAnswer } from "@/services/game-runs-server";
import { generateChoiceQuestion, generateSwapReplacement } from "@/lib/run-content-generator";
import { isRunGameType } from "@/lib/game-run-types";
import { sourceForKind } from "@/lib/play-content-categories";
import { weightForSignal } from "@/services/play-providers/familiarity";
import type { ChoicePrompt } from "@/lib/choice-prompt";
import type { BlindRankPrompt } from "@/lib/blind-rank-prompt";
import type { KeepDropPrompt } from "@/lib/keep-drop-prompt";
import type { Json } from "@/lib/types";

type Body =
  | { runId: string; kind: "choice"; index: number; side: "A" | "B" }
  | { runId: string; kind: "blind_rank" | "keep3_drop2"; item: string };

/**
 * "Don't know this?" -- a safety valve, not a second daily allowance.
 * Replaces ONE unfamiliar item in the ALREADY-generated, shared daily
 * run and persists that change back onto the same game_runs row --
 * never creates a new run, never touches game_run_answers, so it
 * can't consume one of the daily five or count as an answer.
 *
 * Only allowed while the swap can't retroactively invalidate anyone's
 * already-submitted answer: refused once either player has completed
 * this run (their answer, and the result screen built from it, still
 * has to mean what it said against the run's original item set).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const userId = user.id; // captured as a plain string so the nested recordNegativeSignal below doesn't need to re-narrow `user`

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.runId || !body.kind) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const { data: run } = await supabase.from("game_runs").select("*").eq("id", body.runId).maybeSingle();
  if (!run || !isRunGameType(run.game_type)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [mine, membership] = await Promise.all([
    getRunAnswer(run.id, userId),
    supabase.from("space_members").select("user_id").eq("space_id", run.space_id),
  ]);
  if (mine?.completed_at) return NextResponse.json({ error: "already_completed" }, { status: 400 });

  const partnerId = (membership.data ?? []).map((m) => m.user_id).find((id) => id !== userId) ?? null;
  if (partnerId) {
    const partnerAnswer = await getRunAnswer(run.id, partnerId);
    // Once the partner has completed the run, its item set is locked --
    // their answer (and the comparison built from it) is only valid
    // against exactly what they were shown.
    if (partnerAnswer?.completed_at) return NextResponse.json({ error: "partner_completed" }, { status: 409 });
  }

  async function recordNegativeSignal(itemId: string, itemType: string, source: string) {
    await supabase.from("play_item_signals").insert({
      space_id: run!.space_id,
      user_id: userId,
      item_id: itemId,
      item_type: itemType,
      source,
      signal_type: "unknown",
      weight: weightForSignal("unknown"),
    });
  }

  if (body.kind === "choice") {
    if (run.game_type !== "this_or_that" && run.game_type !== "guess_mine") {
      return NextResponse.json({ error: "wrong_game_type" }, { status: 400 });
    }
    const myAnswerCount = (mine?.answers as unknown[] | undefined)?.length ?? 0;
    if (body.index < myAnswerCount) {
      // Already answered -- swapping it now would silently disagree
      // with what this player already submitted for that question.
      return NextResponse.json({ error: "already_answered" }, { status: 400 });
    }
    const questions = run.questions as unknown as ChoicePrompt[];
    const question = questions[body.index];
    if (!question?.items || !question.kind) {
      return NextResponse.json({ error: "no_swap_available" }, { status: 400 });
    }
    const swappedTitle = body.side === "A" ? question.optionA : question.optionB;
    const swappedItem = question.items.find((i) => i.title === swappedTitle);
    if (!swappedItem) return NextResponse.json({ error: "no_swap_available" }, { status: 400 });

    await recordNegativeSignal(swappedItem.id, question.kind, sourceForKind(question.kind));

    // Exclude every item used anywhere in today's run (not just this
    // question) so a replacement can't duplicate a different question.
    const usedIdsElsewhere = questions.flatMap((q, i) => (i === body.index ? [] : (q.items ?? []).map((it) => it.id)));
    const otherSideId = question.items.find((i) => i.title !== swappedTitle)?.id;
    const excludeIds = [...usedIdsElsewhere, ...(otherSideId ? [otherSideId] : []), swappedItem.id];

    const replacement = await generateSwapReplacement(question.kind, run.space_id, excludeIds);
    let nextQuestion: ChoicePrompt;
    let regenerated = false;
    if (replacement && replacement.title !== (body.side === "A" ? question.optionB : question.optionA)) {
      const items = question.items.map((it) => (it.title === swappedTitle ? { id: replacement.id, title: replacement.title } : it));
      nextQuestion =
        body.side === "A"
          ? { ...question, optionA: replacement.title, imageA: replacement.imageUrl, items }
          : { ...question, optionB: replacement.title, imageB: replacement.imageUrl, items };
    } else {
      // No valid single replacement -- regenerate the whole pair
      // instead of leaving (or forcing) an invalid matchup.
      const regeneratedQuestion = await generateChoiceQuestion(run.game_type, run.space_id, usedIdsElsewhere);
      if (!regeneratedQuestion) {
        // No visual kind could produce a replacement pair at all right
        // now -- refuse the swap rather than ever writing a text-only
        // question into the run.
        return NextResponse.json({ error: "no_replacement_available" }, { status: 200 });
      }
      nextQuestion = regeneratedQuestion;
      regenerated = true;
    }

    const nextQuestions = questions.map((q, i) => (i === body.index ? nextQuestion : q));
    // Compare-and-swap on questions_version: only applies if the row is
    // still at the version we read it at, so two near-simultaneous
    // swaps (or a swap racing a partner's own swap) can't silently
    // clobber each other. Bumping the version is also what makes any
    // OTHER client holding this run's *old* questions provably stale --
    // their next answer submission will be refused (see
    // /api/play/run/answer) rather than recorded against content they
    // never actually saw.
    const { data: updated, error } = await supabase
      .from("game_runs")
      .update({ questions: nextQuestions as unknown as Json, questions_version: run.questions_version + 1 })
      .eq("id", run.id)
      .eq("questions_version", run.questions_version)
      .select()
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!updated) return NextResponse.json({ error: "conflict_try_again" }, { status: 409 });
    return NextResponse.json({ run: updated, regenerated });
  }

  // blind_rank / keep3_drop2 -- single shared 5-item set, swap one entry in place.
  if (run.game_type !== body.kind) return NextResponse.json({ error: "wrong_game_type" }, { status: 400 });
  const prompt = (run.questions as unknown as (BlindRankPrompt | KeepDropPrompt)[])[0];
  const ids = prompt?.ids;
  const itemId = ids?.[body.item];
  if (!prompt || !ids || !itemId || !prompt.kind) {
    return NextResponse.json({ error: "no_swap_available" }, { status: 400 });
  }

  await recordNegativeSignal(itemId, prompt.kind, sourceForKind(prompt.kind));

  const excludeIds = Object.values(ids);
  const replacement = await generateSwapReplacement(prompt.kind, run.space_id, excludeIds);
  if (!replacement) return NextResponse.json({ error: "no_replacement_available" }, { status: 200 });

  const items = prompt.items.map((i) => (i === body.item ? replacement.title : i));
  const images = { ...prompt.images };
  delete images[body.item];
  images[replacement.title] = replacement.imageUrl;
  const nextIds = { ...ids };
  delete nextIds[body.item];
  nextIds[replacement.title] = replacement.id;
  const nextPrompt = { ...prompt, items, images, ids: nextIds };

  const { data: updated, error } = await supabase
    .from("game_runs")
    .update({ questions: [nextPrompt] as unknown as Json, questions_version: run.questions_version + 1 })
    .eq("id", run.id)
    .eq("questions_version", run.questions_version)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!updated) return NextResponse.json({ error: "conflict_try_again" }, { status: 409 });
  return NextResponse.json({ run: updated, regenerated: false });
}
