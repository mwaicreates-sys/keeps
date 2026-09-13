"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createGameSession, submitGameAnswer, updateGameSessionPrompt, DailyCapReachedError, type GameType } from "@/services/games-client";
import { getGameSession } from "@/services/games-read-client";
import { pickChoicePrompt, warmAllChoiceKinds, type ChoicePrompt } from "@/lib/choice-prompt";
import { sourceForKind } from "@/lib/play-content-categories";
import { recordPlaySignal, recordPlaySignalForItems } from "@/services/play-signals-client";
import { usePollForResult } from "@/hooks/usePollForResult";
import { playGame } from "@/lib/play-config";
import { RoundHeader } from "@/components/play/RoundHeader";
import { DAILY_PLAY_CAP } from "@/lib/game-types";
import { RoundTagline } from "@/components/play/RoundTagline";
import { getErrorMessage } from "@/lib/utils";
import type { GameSessionRow } from "@/lib/game-types";
import type { Json } from "@/lib/types";

/**
 * The actual immersive gameplay screen for one This or That / Guess Mine
 * round -- lives at /play/<slug>/<sessionId>, distinct from the history
 * list at /play/<slug>. Real, image-first content whenever the round's
 * prompt carries images (real artist photos): tap a card and it locks
 * in immediately, no separate confirm step. A plain two-option layout
 * (with its own "Lock it in" button) only for the rare hardcoded-pack
 * fallback round.
 */
export function ChoiceGameRound({
  gameType,
  slug,
  session: initialSession,
  roundNumber,
}: {
  gameType: "this_or_that" | "guess_mine";
  slug: string;
  session: GameSessionRow;
  roundNumber: number;
}) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const game = playGame(slug);
  const [session, setSession] = useState(initialSession);
  const [choice, setChoice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startingNext, setStartingNext] = useState(false);
  const [swapping, setSwapping] = useState(false);

  const prompt = session.prompt as unknown as ChoicePrompt;
  const answeredByMe = session.game_answers.some((a) => a.user_id === userId);
  const result = session.game_results?.result as { matched: boolean; [userId: string]: unknown } | undefined;
  const isVisual = !!(prompt.imageA || prompt.imageB);
  const question = isVisual ? (gameType === "guess_mine" ? "Which one would they pick?" : "Which one are you keeping?") : prompt.topic;

  // Warm the *next* round's pool while this one's being played.
  useEffect(() => {
    warmAllChoiceKinds(space.id);
  }, [space.id]);

  // While waiting on the partner, poll for the result so it appears
  // the moment they answer -- no manual refresh needed, and no
  // provider content in this read path at all.
  usePollForResult(session.id, answeredByMe && !result, (fresh) => setSession(fresh));

  async function submit(value: string) {
    setChoice(value);
    setSubmitting(true);
    try {
      await submitGameAnswer({
        sessionId: session.id,
        userId,
        answer: { choice: value },
        spaceId: space.id,
        otherMemberId: otherMember?.id ?? null,
        gameType: gameType as GameType,
        topic: session.topic,
      });
      // Selection proves familiarity/engagement, not preference -- a
      // separate signal from whichever option "won".
      const chosen = prompt.items?.find((i) => i.title === value);
      if (chosen) {
        const kind = prompt.kind ?? "artist";
        recordPlaySignal({ spaceId: space.id, itemId: chosen.id, itemType: kind, source: sourceForKind(kind), signalType: "selected" });
      }
      const fresh = await getGameSession(session.id);
      setSession(fresh as unknown as GameSessionRow);
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't submit your answer."), "error");
      setChoice(null);
    } finally {
      setSubmitting(false);
    }
  }

  /** "Don't know this?" -- swaps the whole pair (both options are tied
   * together in a This or That matchup) rather than one card, records a
   * negative familiarity signal against the current items, and persists
   * the new prompt to the session so a partner opening the same round
   * sees the same swapped content. Pre-answer only. */
  async function swapPair() {
    if (!prompt.items?.length) return;
    setSwapping(true);
    try {
      const kind = prompt.kind ?? "artist";
      recordPlaySignalForItems(
        prompt.items.map((i) => ({ id: i.id, type: kind, source: sourceForKind(kind) })),
        space.id,
        "unknown"
      );
      const next = await pickChoicePrompt(
        gameType,
        space.id,
        prompt.items.map((i) => i.id)
      );
      await updateGameSessionPrompt({ sessionId: session.id, prompt: next as unknown as Record<string, unknown>, topic: next.topic, category: next.category });
      setSession((prev) => ({ ...prev, prompt: next as unknown as Json, topic: next.topic, category: next.category }));
    } catch (err) {
      show(getErrorMessage(err, "Couldn't swap this round."), "error");
    } finally {
      setSwapping(false);
    }
  }

  async function nextRound() {
    setStartingNext(true);
    try {
      const next = await pickChoicePrompt(gameType, space.id);
      const created = await createGameSession({
        spaceId: space.id,
        createdBy: userId,
        otherMemberId: otherMember?.id ?? null,
        gameType,
        topic: next.topic,
        category: next.category,
        prompt: next,
      });
      router.push(`/play/${slug}/${created.id}`);
    } catch (err) {
      if (err instanceof DailyCapReachedError) {
        // The daily cap was hit exactly on this attempt -- the base
        // route now redirects/gates on the same check, so send the
        // player there instead of showing a raw error toast.
        router.push(`/play/${slug}`);
        return;
      }
      show(getErrorMessage(err, "Couldn't start the next round."), "error");
      setStartingNext(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-6">
      <RoundHeader
        slug={slug}
        title={game.label}
        category={prompt.category}
        icon={game.icon}
        pillBg={game.bg}
        pillColor={game.iconColor}
        roundNumber={roundNumber}
        roundTotal={DAILY_PLAY_CAP}
        question={question}
      />

      {result ? (
        <div className="space-y-3">
          <div
            className={`rounded-2xl px-4 py-3 text-center text-[15px] font-semibold ${
              result.matched ? "bg-[#e6f2e9] text-[#2f8f52]" : "bg-[#fdecec] text-[#c23a3a]"
            }`}
          >
            {result.matched ? "You matched! 🎉" : "You picked differently"}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ChoiceResultCard label="You" value={result[userId] as string} imageUrl={imageForValue(prompt, result[userId] as string)} />
            {otherMember && (
              <ChoiceResultCard
                label={otherMember.display_name}
                value={result[otherMember.id] as string}
                imageUrl={imageForValue(prompt, result[otherMember.id] as string)}
              />
            )}
          </div>
          <button
            type="button"
            onClick={nextRound}
            disabled={startingNext}
            className="w-full rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {startingNext ? "Starting…" : "Next round"}
          </button>
        </div>
      ) : answeredByMe ? (
        <div className="rounded-2xl bg-[#f7f5f1] px-4 py-8 text-center">
          <p className="text-[15px] font-semibold text-[#3a362f]">Answer locked in</p>
          <p className="mt-1 text-[13px] text-[#a39d92]">
            Waiting on {otherMember?.display_name ?? "your partner"} to answer too.
          </p>
        </div>
      ) : isVisual ? (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: prompt.optionA, image: prompt.imageA },
              { label: prompt.optionB, image: prompt.imageB },
            ].map(({ label, image }) => (
              <button
                key={label}
                type="button"
                onClick={() => !submitting && submit(label)}
                disabled={submitting}
                className={`text-center transition ${choice === label ? "scale-[0.98]" : choice ? "opacity-60" : ""}`}
              >
                <div className={`relative aspect-square w-full overflow-hidden rounded-[22px] bg-[#f2efe9] ${choice === label ? "ring-[3px] ring-[#3a362f]" : ""}`}>
                  {image ? (
                    // Both cards are the whole screen -- always high
                    // priority, per the perf pass's two-choice-game rule.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" loading="eager" fetchPriority="high" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[#a39d92]">
                      <HelpCircle size={28} />
                    </div>
                  )}
                  <span
                    className={`absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white ${
                      choice === label ? "bg-[#3a362f]" : "bg-white/25"
                    }`}
                  >
                    {choice === label && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                </div>
                <p className="mt-2 truncate text-[14px] font-bold text-[#3a362f]">{label}</p>
              </button>
            ))}
          </div>
          <p className="text-center text-[12.5px] text-[#a39d92]">{submitting ? "Locking it in…" : "Tap a card to choose"}</p>
          <button
            type="button"
            onClick={swapPair}
            disabled={swapping || submitting}
            className="mx-auto block text-[12.5px] font-semibold text-[#a39d92] underline decoration-dotted underline-offset-2 disabled:opacity-50"
          >
            {swapping ? "Finding something else…" : "Don't know either? Swap"}
          </button>
        </div>
      ) : (
        // Text-only fallback (rare -- only when the provider pool comes
        // up short, see pickChoicePrompt) gets the same tap-locks-in-
        // immediately behavior as the visual path, per the auto-advance
        // rule: no separate "Lock it in" confirm step for a simple
        // two-option choice.
        <div className="space-y-2.5">
          {[prompt.optionA, prompt.optionB].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => !submitting && submit(opt)}
              disabled={submitting}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-[15.5px] font-semibold transition ${
                choice === opt ? "scale-[0.99] bg-[#3a362f] text-white" : "bg-[#f7f5f1] text-[#3a362f]"
              } ${choice && choice !== opt ? "opacity-60" : ""}`}
            >
              {opt}
            </button>
          ))}
          <p className="text-center text-[12.5px] text-[#a39d92]">{submitting ? "Locking it in…" : "Tap to choose"}</p>
        </div>
      )}

      {game.tagline && game.taglineIcon && <RoundTagline text={game.tagline} icon={game.taglineIcon} />}
    </div>
  );
}

function imageForValue(prompt: ChoicePrompt, value: string): string | null | undefined {
  if (value === prompt.optionA) return prompt.imageA;
  if (value === prompt.optionB) return prompt.imageB;
  return undefined;
}

function ChoiceResultCard({ label, value, imageUrl }: { label: string; value: string; imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      <div className="text-center">
        <div className="overflow-hidden rounded-2xl bg-[#f7f5f1]">
          <div className="relative aspect-square w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
        <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#a39d92]">{label}</p>
        <p className="truncate text-[13.5px] font-bold text-[#3a362f]">{value}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-[#f7f5f1] px-4 py-4 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a39d92]">{label}</p>
      <p className="mt-1 text-[15px] font-bold text-[#3a362f]">{value}</p>
    </div>
  );
}
