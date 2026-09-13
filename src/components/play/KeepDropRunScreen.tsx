"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useToast } from "@/components/Toast";
import { submitRunAnswer } from "@/services/game-runs-client";
import { KEEP_COUNT } from "@/lib/keep-drop-prompt";
import { playGame } from "@/lib/play-config";
import { RoundHeader } from "@/components/play/RoundHeader";
import { RoundTagline } from "@/components/play/RoundTagline";
import { RunWaitingForPartner } from "@/components/play/RunWaitingForPartner";
import { getErrorMessage } from "@/lib/utils";
import type { KeepDropPrompt } from "@/lib/keep-drop-prompt";
import type { RunResult } from "@/lib/game-run-result";
import type { RunStartResponse } from "@/services/game-runs-client";

const game = playGame("keep3-drop2");

/** Today's Keep 3, Drop 2 run -- a single keep-3-of-5 action (already
 * one submission per round before this change; the daily-run model
 * just makes it the whole day's run instead of up to 5 per day). */
export function KeepDropRunScreen({ initial }: { initial: RunStartResponse }) {
  const { show } = useToast();
  const prompt = (initial.run.questions as unknown as KeepDropPrompt[])[0];
  const isVisual = !!prompt.images;

  const priorKept = (initial.mine?.answers as { kept: string[] }[] | undefined)?.[0]?.kept;
  const [kept, setKept] = useState<string[]>(priorKept ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(!!initial.mine?.completed_at);
  const [result, setResult] = useState<RunResult | null>(initial.result);

  function toggle(item: string) {
    setKept((prev) => {
      if (prev.includes(item)) return prev.filter((i) => i !== item);
      if (prev.length >= KEEP_COUNT) return prev;
      return [...prev, item];
    });
  }

  async function submit() {
    if (kept.length !== KEEP_COUNT) return;
    setSubmitting(true);
    try {
      const res = await submitRunAnswer(initial.run.id, { kept });
      setCompleted(true);
      if (res.result) setResult(res.result);
    } catch (err) {
      show(getErrorMessage(err, "Couldn't submit your picks."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (completed) {
    if (result && result.kind === "keep3_drop2") {
      return (
        <div className="mx-auto max-w-xl px-4 pb-6">
          <RoundHeader
            slug="keep3-drop2"
            title={game.label}
            category={prompt.category}
            icon={game.icon}
            pillBg={game.bg}
            pillColor={game.iconColor}
            roundNumber={1}
            roundTotal={1}
            question="Today's results"
          />
          <div className="space-y-3">
            <div className="rounded-2xl bg-[#fdecec] px-4 py-3 text-center">
              <p className="text-[15px] font-semibold text-[#c23a3a]">
                {result.overlapCount} kept in common
                {result.overlap.length > 0 && `: ${result.overlap.join(", ")}`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <KeptList label="You" kept={result.mine} all={prompt.items} images={prompt.images} />
              <KeptList label="Them" kept={result.theirs} all={prompt.items} images={prompt.images} />
            </div>
          </div>
          {game.tagline && game.taglineIcon && <RoundTagline text={game.tagline} icon={game.taglineIcon} />}
        </div>
      );
    }
    return (
      <RunWaitingForPartner icon={game.icon} bg={game.bg} iconColor={game.iconColor} headline="Picks locked in" partnerName={initial.partner?.display_name ?? null} />
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-6">
      <RoundHeader
        slug="keep3-drop2"
        title={game.label}
        category={prompt.category}
        icon={game.icon}
        pillBg={game.bg}
        pillColor={game.iconColor}
        roundNumber={1}
        roundTotal={1}
        question={isVisual ? "Pick 3 to keep" : (initial.run.topic ?? "Pick 3 to keep")}
      />
      {isVisual ? (
        <div>
          <div className="grid grid-cols-2 gap-3">
            {prompt.items.map((item, i) => {
              const isKept = kept.includes(item);
              const image = prompt.images?.[item];
              return (
                <div
                  key={item}
                  className={`text-center ${i === prompt.items.length - 1 && prompt.items.length % 2 === 1 ? "col-span-2 mx-auto w-1/2 min-w-[45%]" : ""}`}
                >
                  <button type="button" onClick={() => toggle(item)} className="block w-full transition">
                    <div className={`relative aspect-square w-full overflow-hidden rounded-[18px] bg-[#f2efe9] ${isKept ? "ring-[3px] ring-[#3a362f]" : ""}`}>
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
                          alt=""
                          loading="eager"
                          fetchPriority={i < 2 ? "high" : "auto"}
                          className={`h-full w-full object-cover transition ${!isKept && kept.length >= KEEP_COUNT ? "opacity-50" : ""}`}
                        />
                      ) : (
                        <div className="h-full w-full bg-black/10" />
                      )}
                      <span
                        className={`absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-white ${
                          isKept ? "bg-[#c23a3a]" : "bg-white/25"
                        }`}
                      >
                        {isKept && <Check size={13} className="text-white" />}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-[13px] font-bold text-[#3a362f]">{item}</p>
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={kept.length !== KEEP_COUNT || submitting}
            className="mt-3.5 w-full rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Submitting…" : `Confirm ${KEEP_COUNT} picks`}
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-[12.5px] text-[#a39d92]">Keep exactly {KEEP_COUNT} — the rest get dropped.</p>
          <div className="space-y-2">
            {prompt.items.map((item) => {
              const isKept = kept.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggle(item)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-[14.5px] font-medium transition ${
                    isKept ? "bg-[#3a362f] text-white" : "bg-[#f7f5f1] text-[#3a362f]"
                  }`}
                >
                  {item}
                  {isKept && <Check size={17} />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={kept.length !== KEEP_COUNT || submitting}
            className="mt-3 w-full rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Submitting…" : `Confirm ${KEEP_COUNT} picks`}
          </button>
        </div>
      )}
      {game.tagline && game.taglineIcon && <RoundTagline text={game.tagline} icon={game.taglineIcon} />}
    </div>
  );
}

function KeptList({ label, kept, all, images }: { label: string; kept: string[]; all: string[]; images?: Record<string, string | null> }) {
  return (
    <div className="rounded-2xl bg-[#f7f5f1] p-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#a39d92]">{label}</p>
      <ul className="space-y-1.5">
        {all.map((item) => {
          const image = images?.[item];
          const isKept = kept.includes(item);
          return (
            <li key={item} className="flex items-center gap-2">
              {image !== undefined &&
                (image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" className={`h-7 w-7 shrink-0 rounded-md object-cover ${isKept ? "" : "opacity-40 grayscale"}`} />
                ) : (
                  <div className="h-7 w-7 shrink-0 rounded-md bg-black/10" />
                ))}
              <span className={`truncate text-[12.5px] ${isKept ? "font-semibold text-[#3a362f]" : "text-[#c7c1b6] line-through"}`}>{item}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
