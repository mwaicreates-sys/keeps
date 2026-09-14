"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { submitRunAnswer, swapRunItem, StaleRunError } from "@/services/game-runs-client";
import { sourceForKind, isMusicKind } from "@/lib/play-content-categories";
import { recordPlaySignal } from "@/services/play-signals-client";
import { playGame } from "@/lib/play-config";
import { RoundHeader } from "@/components/play/RoundHeader";
import { RoundTagline } from "@/components/play/RoundTagline";
import { RunWaitingForPartner } from "@/components/play/RunWaitingForPartner";
import { RunUnavailable } from "@/components/play/RunUnavailable";
import { getErrorMessage } from "@/lib/utils";
import type { ChoicePrompt } from "@/lib/choice-prompt";
import type { RunResult } from "@/lib/game-run-result";
import type { RunStartResponse } from "@/services/game-runs-client";

type NonNullRunStartResponse = RunStartResponse & { run: NonNullable<RunStartResponse["run"]> };

/**
 * The daily continuous-run screen for This or That / Guess Mine --
 * replaces the old one-session-per-question, wait-for-partner-between-
 * every-tap model. All 5 questions are already sitting in `run.questions`
 * (generated once, together, when either player first opened the game
 * today) -- there is no provider round trip between taps, only a save.
 *
 * Tap a card -> selected state right away -> answer saves in the
 * background -> a brief transition -> next question. No "Lock it in",
 * no "Next question." After question 5, if the partner has already
 * finished today's run too, the comparison shows immediately; otherwise
 * this player is sent back to Play with "results when they finish" --
 * never blocked waiting mid-run.
 *
 * `initial.run` is null only when no visual content could be generated
 * at all today -- shown as RunUnavailable instead (never a text-only
 * round). Split into a thin wrapper + inner component (rather than an
 * early return before hooks) so the inner component can assume a
 * non-null run throughout.
 */
export function ChoiceRunScreen({ gameType, slug, initial }: { gameType: "this_or_that" | "guess_mine"; slug: string; initial: RunStartResponse }) {
  const game = playGame(slug);
  if (!initial.run) return <RunUnavailable icon={game.icon} bg={game.bg} iconColor={game.iconColor} label={game.label} />;
  return <ChoiceRunScreenInner gameType={gameType} slug={slug} initial={initial as NonNullRunStartResponse} />;
}

function ChoiceRunScreenInner({ gameType, slug, initial }: { gameType: "this_or_that" | "guess_mine"; slug: string; initial: NonNullRunStartResponse }) {
  const { space } = useSession();
  const { show } = useToast();
  const game = playGame(slug);

  const myPriorAnswers = ((initial.mine?.answers as { choice: string }[] | undefined) ?? []).map((a) => a.choice);

  // Held in state (not a plain const off `initial`) because a swap
  // mutates one question in place -- the run itself is unchanged
  // (same id, same other 4 questions), just this one entry replaced.
  const [questions, setQuestions] = useState<ChoicePrompt[]>(initial.run.questions as unknown as ChoicePrompt[]);
  const [questionsVersion, setQuestionsVersion] = useState(initial.run.questions_version);
  const [answers, setAnswers] = useState<string[]>(myPriorAnswers);
  const [selected, setSelected] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [swapping, setSwapping] = useState<"A" | "B" | null>(null);
  const [completed, setCompleted] = useState(!!initial.mine?.completed_at);
  const [result, setResult] = useState<RunResult | null>(initial.result);

  const currentIndex = answers.length;
  const question = questions[currentIndex];

  async function choose(value: string) {
    if (selected || advancing) return;
    setSelected(value);
    const chosen = question.items?.find((i) => i.title === value);
    if (chosen) {
      const kind = question.kind ?? "artist";
      recordPlaySignal({ spaceId: space.id, itemId: chosen.id, itemType: kind, source: sourceForKind(kind), signalType: "selected" });
    }
    setAdvancing(true);
    try {
      const res = await submitRunAnswer(initial.run.id, { choice: value }, questionsVersion);
      // Brief, deliberate pause so the selection ring/feedback is
      // visible before the screen moves on -- per the "~250-450ms
      // transition" rule, not an artificial network delay.
      await new Promise((r) => setTimeout(r, 320));
      setAnswers((prev) => [...prev, value]);
      setSelected(null);
      setAdvancing(false);
      if (res.completed) {
        setCompleted(true);
        if (res.result) setResult(res.result);
      }
    } catch (err) {
      if (err instanceof StaleRunError) {
        // A swap changed today's set after this player loaded it --
        // never silently record an answer against stale content.
        // Reloading re-fetches the run fresh and resumes exactly where
        // this player's already-submitted answers left off.
        show("Today's set just updated -- refreshing…", "error");
        window.location.reload();
        return;
      }
      show(getErrorMessage(err, "Couldn't save your answer."), "error");
      setSelected(null);
      setAdvancing(false);
    }
  }

  /** "Don't know this?" -- a safety valve, not a second daily
   * allowance: replaces just the unfamiliar side where a valid
   * same-kind, image-bearing replacement exists; regenerates the whole
   * pair (server-side) if it doesn't, rather than leaving an invalid
   * matchup. Never touches the daily answer count. */
  async function swapSide(side: "A" | "B") {
    if (swapping || selected || advancing) return;
    setSwapping(side);
    try {
      const res = await swapRunItem({ runId: initial.run.id, kind: "choice", index: currentIndex, side });
      const nextQuestions = res.run.questions as unknown as ChoicePrompt[];
      setQuestions(nextQuestions);
      setQuestionsVersion(res.run.questions_version);
    } catch (err) {
      show(getErrorMessage(err, "Couldn't swap this. Your partner may have already finished today's run."), "error");
    } finally {
      setSwapping(null);
    }
  }

  if (completed) {
    if (result) {
      return (
        <div className="mx-auto max-w-xl px-4 pb-6">
          <RoundHeader
            slug={slug}
            title={game.label}
            category={initial.run.category ?? "Mixed"}
            icon={game.icon}
            pillBg={game.bg}
            pillColor={game.iconColor}
            roundNumber={5}
            roundTotal={5}
            question="Today's results"
          />
          {result.kind === "choice" && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-[#e6f2e9] px-4 py-3 text-center">
                <p className="text-[15px] font-semibold text-[#2f8f52]">
                  {result.matchedCount} of {result.total} matched
                </p>
              </div>
              <div className="space-y-2">
                {result.perQuestion.map((pq) => {
                  const q = questions[pq.index];
                  return (
                    <div key={pq.index} className={`rounded-xl p-2.5 ${pq.matched ? "bg-[#e6f2e9]" : "bg-[#f7f5f1]"}`}>
                      <div className="grid grid-cols-2 gap-2">
                        <ResultOption label={q.optionA} image={q.imageA} picked={pq.mine === q.optionA} pickedBy={pq.theirs === q.optionA ? "them" : undefined} />
                        <ResultOption label={q.optionB} image={q.imageB} picked={pq.mine === q.optionB} pickedBy={pq.theirs === q.optionB ? "them" : undefined} />
                      </div>
                      <p className="mt-1.5 text-center text-[11.5px] font-semibold text-[#7c766c]">
                        {pq.matched ? "Matched" : "Different"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* This or That's music-specific tagline is skipped here --
              a completed run's 5 questions can mix kinds, so a single
              "Music hits different together" caption would be wrong
              for whichever aren't music. Guess Mine's generic tagline
              applies regardless of kind, so it still shows. */}
          {gameType === "guess_mine" && game.tagline && game.taglineIcon && <RoundTagline text={game.tagline} icon={game.taglineIcon} />}
        </div>
      );
    }
    return (
      <RunWaitingForPartner
        icon={game.icon}
        bg={game.bg}
        iconColor={game.iconColor}
        headline="That's today's 5"
        partnerName={initial.partner?.display_name ?? null}
      />
    );
  }

  if (!question) return null; // guard -- shouldn't happen once completed is handled above

  const isVisual = !!(question.imageA || question.imageB);

  return (
    <div className="mx-auto max-w-xl px-4 pb-6">
      <RoundHeader
        slug={slug}
        title={game.label}
        category={question.category}
        icon={game.icon}
        pillBg={game.bg}
        pillColor={game.iconColor}
        roundNumber={currentIndex + 1}
        roundTotal={questions.length}
        question={isVisual ? (gameType === "guess_mine" ? "Which one would they pick?" : "Which one are you keeping?") : question.topic}
      />

      {isVisual ? (
        <div className="grid grid-cols-2 gap-3">
          {(["A", "B"] as const).map((side) => {
            const label = side === "A" ? question.optionA : question.optionB;
            const image = side === "A" ? question.imageA : question.imageB;
            const canSwap = !!question.items;
            return (
              <div key={side} className="relative text-center">
                <button
                  type="button"
                  onClick={() => choose(label)}
                  disabled={!!selected || swapping !== null}
                  className={`block w-full transition ${selected === label ? "scale-[0.98]" : selected ? "opacity-60" : ""}`}
                >
                  <div
                    className={`relative aspect-square w-full overflow-hidden rounded-[22px] bg-[#f2efe9] ${selected === label ? "ring-[3px] ring-[#3a362f]" : ""} ${swapping === side ? "opacity-50" : ""}`}
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" loading="eager" fetchPriority="high" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[#a39d92]">
                        <HelpCircle size={28} />
                      </div>
                    )}
                    <span
                      className={`absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white ${
                        selected === label ? "bg-[#3a362f]" : "bg-white/25"
                      }`}
                    >
                      {selected === label && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-[14px] font-bold text-[#3a362f]">{label}</p>
                </button>
                {canSwap && (
                  <button
                    type="button"
                    onClick={() => swapSide(side)}
                    disabled={swapping !== null || !!selected}
                    aria-label={`Don't know ${label}? Swap it`}
                    className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-white/25 text-white disabled:opacity-50"
                  >
                    <HelpCircle size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {[question.optionA, question.optionB].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => choose(opt)}
              disabled={!!selected}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-[15.5px] font-semibold transition ${
                selected === opt ? "scale-[0.99] bg-[#3a362f] text-white" : "bg-[#f7f5f1] text-[#3a362f]"
              } ${selected && selected !== opt ? "opacity-60" : ""}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* This or That's own tagline ("Music hits different together")
          names music specifically, so it only makes sense when this
          particular question actually is music -- Guess Mine's own
          tagline is generic ("Different choices. Same good company.")
          and applies to any category, so it isn't gated here. */}
      {game.tagline &&
        game.taglineIcon &&
        (gameType !== "this_or_that" || (question.kind && isMusicKind(question.kind))) && (
          <RoundTagline text={game.tagline} icon={game.taglineIcon} />
        )}
    </div>
  );
}

function ResultOption({ label, image, picked, pickedBy }: { label: string; image?: string | null; picked: boolean; pickedBy?: "them" }) {
  return (
    <div className={`overflow-hidden rounded-xl ${picked ? "ring-2 ring-[#3a362f]" : ""}`}>
      <div className="relative aspect-square w-full bg-[#f2efe9]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-[#a39d92]">
            <HelpCircle size={22} />
          </div>
        )}
      </div>
      <p className="truncate bg-white px-1.5 py-1 text-center text-[11px] font-semibold text-[#3a362f]">
        {label}
        {picked && " · You"}
        {pickedBy && " · Them"}
      </p>
    </div>
  );
}
