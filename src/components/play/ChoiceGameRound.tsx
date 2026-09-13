"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X as XIcon, HelpCircle } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createGameSession, submitGameAnswer, type GameType } from "@/services/games-client";
import { getGameSession } from "@/services/games-read-client";
import { prefetchMusicPool } from "@/services/music-pool-client";
import { pickChoicePrompt, type ChoicePrompt } from "@/lib/choice-prompt";
import { getErrorMessage } from "@/lib/utils";
import type { GameSessionRow } from "@/lib/game-types";

/**
 * The actual immersive gameplay screen for one This or That / Guess Mine
 * round -- lives at /play/<slug>/<sessionId>, distinct from the history
 * list at /play/<slug>. Real, image-first content whenever the round's
 * prompt carries images (real artist photos); a plain two-option layout
 * only for the rare hardcoded-pack fallback round.
 */
export function ChoiceGameRound({
  gameType,
  slug,
  session: initialSession,
}: {
  gameType: "this_or_that" | "guess_mine";
  slug: string;
  session: GameSessionRow;
}) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [choice, setChoice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startingNext, setStartingNext] = useState(false);

  const prompt = session.prompt as unknown as ChoicePrompt;
  const answeredByMe = session.game_answers.some((a) => a.user_id === userId);
  const result = session.game_results?.result as { matched: boolean; [userId: string]: unknown } | undefined;
  const isVisual = !!(prompt.imageA || prompt.imageB);

  // Warm the *next* round's pool while this one's being played.
  useEffect(() => {
    prefetchMusicPool("artist", 2, space.id);
  }, [space.id]);

  async function submit() {
    if (!choice) return;
    setSubmitting(true);
    try {
      await submitGameAnswer({
        sessionId: session.id,
        userId,
        answer: { choice },
        spaceId: space.id,
        otherMemberId: otherMember?.id ?? null,
        gameType: gameType as GameType,
        topic: session.topic,
      });
      const fresh = await getGameSession(session.id);
      setSession(fresh as unknown as GameSessionRow);
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't submit your answer."), "error");
    } finally {
      setSubmitting(false);
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
      show(getErrorMessage(err, "Couldn't start the next round."), "error");
      setStartingNext(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-6">
      <div className="mb-4 flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.push(`/play/${slug}`)}
          aria-label="Back"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#3a362f] shadow-sm"
        >
          <XIcon size={20} />
        </button>
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[#a39d92]">{prompt.category}</p>
          <p className="truncate text-[19px] font-bold text-[#3a362f]">{prompt.topic}</p>
        </div>
      </div>

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
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: prompt.optionA, image: prompt.imageA },
              { label: prompt.optionB, image: prompt.imageB },
            ].map(({ label, image }) => (
              <button
                key={label}
                type="button"
                onClick={() => setChoice(label)}
                className={`overflow-hidden rounded-[22px] text-left transition ${
                  choice === label ? "scale-[0.98] ring-[3px] ring-[#3a362f]" : choice ? "opacity-60" : ""
                }`}
              >
                <div className="relative aspect-square w-full bg-[#f2efe9]">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[#a39d92]">
                      <HelpCircle size={28} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-6">
                    <p className="truncate text-[14px] font-bold text-white">{label}</p>
                  </div>
                  {choice === label && (
                    <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-[#3a362f]">
                      <Check size={15} />
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!choice || submitting}
            className="w-full rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Lock it in"}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {[prompt.optionA, prompt.optionB].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setChoice(opt)}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-[15.5px] font-semibold transition ${
                choice === opt ? "bg-[#3a362f] text-white" : "bg-[#f7f5f1] text-[#3a362f]"
              }`}
            >
              {opt}
              {choice === opt && <Check size={18} />}
            </button>
          ))}
          <button
            type="button"
            onClick={submit}
            disabled={!choice || submitting}
            className="mt-2 w-full rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Lock it in"}
          </button>
        </div>
      )}
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
      <div className="overflow-hidden rounded-2xl bg-[#f7f5f1]">
        <div className="relative aspect-square w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/75">{label}</p>
            <p className="truncate text-[13px] font-bold text-white">{value}</p>
          </div>
        </div>
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
