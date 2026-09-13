"use client";

import { useState } from "react";
import { RotateCcw, HelpCircle } from "lucide-react";
import { useToast } from "@/components/Toast";
import { submitRunAnswer, swapRunItem, StaleRunError } from "@/services/game-runs-client";
import { playGame } from "@/lib/play-config";
import { RoundHeader } from "@/components/play/RoundHeader";
import { RoundTagline } from "@/components/play/RoundTagline";
import { RunWaitingForPartner } from "@/components/play/RunWaitingForPartner";
import { getErrorMessage } from "@/lib/utils";
import type { BlindRankPrompt } from "@/lib/blind-rank-prompt";
import type { RunResult } from "@/lib/game-run-result";
import type { RunStartResponse } from "@/services/game-runs-client";

const game = playGame("blind-rank");

/**
 * Today's Blind Rank run -- a single 5-item ranking action (unlike
 * This or That's 5 separate questions, Blind Rank was already "one
 * ranking = one round"; the daily-run model just makes that one
 * ranking the entire day's run instead of allowing up to 5 separate
 * ranking rounds per day). Submits once, then either shows the
 * comparison immediately (partner already finished today) or sends the
 * player back to Play with a "results when they finish" notice.
 */
export function BlindRankRunScreen({ initial }: { initial: RunStartResponse }) {
  const { show } = useToast();

  // Held in state (not derived directly from `initial`) because a swap
  // mutates the run's item set in place -- same run id, one item title/
  // image/id replaced.
  const [prompt, setPrompt] = useState<BlindRankPrompt>((initial.run.questions as unknown as BlindRankPrompt[])[0]);
  const [questionsVersion, setQuestionsVersion] = useState(initial.run.questions_version);

  const priorRanking = (initial.mine?.answers as { ranking: Record<string, number> }[] | undefined)?.[0]?.ranking;
  const [order, setOrder] = useState<string[]>(priorRanking ? Object.keys(priorRanking).sort((a, b) => priorRanking[a] - priorRanking[b]) : []);
  const [submitting, setSubmitting] = useState(false);
  const [swappingItem, setSwappingItem] = useState<string | null>(null);
  const [completed, setCompleted] = useState(!!initial.mine?.completed_at);
  const [result, setResult] = useState<RunResult | null>(initial.result);

  function tapItem(item: string) {
    setOrder((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  }

  /** "Don't know this?" -- only offered before the item has been added
   * to the ranking (tapped into `order`), per the rule: replace it
   * without consuming a rank position. Mutates the run's shared item
   * set in place; never touches the daily answer count. */
  async function swapItem(item: string) {
    if (order.includes(item)) return; // already ranked -- not swappable anymore
    setSwappingItem(item);
    try {
      const res = await swapRunItem({ runId: initial.run.id, kind: "blind_rank", item });
      setPrompt((res.run.questions as unknown as BlindRankPrompt[])[0]);
      setQuestionsVersion(res.run.questions_version);
    } catch (err) {
      show(getErrorMessage(err, "Couldn't swap this item. Your partner may have already finished today's run."), "error");
    } finally {
      setSwappingItem(null);
    }
  }

  async function submit() {
    if (order.length !== prompt.items.length) {
      show("Rank every item before locking it in.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const ranking: Record<string, number> = {};
      order.forEach((item, i) => {
        ranking[item] = i + 1;
      });
      const res = await submitRunAnswer(initial.run.id, { ranking }, questionsVersion);
      setCompleted(true);
      if (res.result) setResult(res.result);
    } catch (err) {
      if (err instanceof StaleRunError) {
        show("Today's set just updated -- refreshing…", "error");
        window.location.reload();
        return;
      }
      show(getErrorMessage(err, "Couldn't submit your ranking."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (completed) {
    if (result && result.kind === "blind_rank") {
      return (
        <div className="mx-auto max-w-xl px-4 pb-6">
          <RoundHeader
            slug="blind-rank"
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
            <div className="rounded-2xl bg-[#e6f2e9] px-4 py-3 text-center">
              <p className="text-[15px] font-semibold text-[#2f8f52]">
                {result.matches} of {prompt.items.length} ranked the same
              </p>
            </div>
            <div className="space-y-1.5">
              {prompt.items.map((item) => {
                const mine = result.mine[item];
                const theirs = result.theirs[item];
                const same = mine === theirs;
                const image = prompt.images?.[item];
                return (
                  <div key={item} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${same ? "bg-[#e6f2e9]" : "bg-[#f7f5f1]"}`}>
                    {image !== undefined && <ItemThumb imageUrl={image} />}
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[#3a362f]">{item}</span>
                    <span className="shrink-0 text-[12px] text-[#7c766c]">
                      You #{mine} · Them #{theirs}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {game.tagline && game.taglineIcon && <RoundTagline text={game.tagline} icon={game.taglineIcon} />}
        </div>
      );
    }
    return (
      <RunWaitingForPartner icon={game.icon} bg={game.bg} iconColor={game.iconColor} headline="Ranking locked in" partnerName={initial.partner?.display_name ?? null} />
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-6">
      <RoundHeader
        slug="blind-rank"
        title={game.label}
        category={prompt.category}
        icon={game.icon}
        pillBg={game.bg}
        pillColor={game.iconColor}
        roundNumber={1}
        roundTotal={1}
        question={initial.run.topic ?? "Rank these"}
      />
      <p className="mb-3 text-[12.5px] text-[#a39d92]">Tap in order, favorite first. Tap again to undo.</p>
      <div className="space-y-2">
        {prompt.items.map((item) => {
          const rank = order.indexOf(item);
          const image = prompt.images?.[item];
          const canSwap = !!prompt.ids?.[item] && rank < 0; // only before it's ranked
          return (
            <div key={item} className={`flex w-full items-center gap-2 rounded-2xl p-2 transition ${rank >= 0 ? "bg-[#3a362f]" : "bg-[#f7f5f1]"}`}>
              <button type="button" onClick={() => tapItem(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                {image !== undefined && <ItemThumb imageUrl={image} />}
                <span className={`min-w-0 flex-1 truncate text-[14.5px] font-medium ${rank >= 0 ? "text-white" : "text-[#3a362f]"}`}>{item}</span>
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[13px] font-bold ${
                    rank >= 0 ? "bg-white/20 text-white" : "border-2 border-[#e3ddd2] text-transparent"
                  }`}
                >
                  {rank >= 0 ? rank + 1 : "·"}
                </span>
              </button>
              {canSwap && (
                <button
                  type="button"
                  onClick={() => swapItem(item)}
                  disabled={swappingItem !== null}
                  aria-label={`Don't know ${item}? Swap it`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#a39d92] disabled:opacity-50"
                >
                  <HelpCircle size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setOrder([])}
          aria-label="Start over"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f2efe9] text-[#3a362f]"
        >
          <RotateCcw size={17} />
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={order.length !== prompt.items.length || submitting}
          className="flex-1 rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Lock it in"}
        </button>
      </div>
      {game.tagline && game.taglineIcon && <RoundTagline text={game.tagline} icon={game.taglineIcon} />}
    </div>
  );
}

function ItemThumb({ imageUrl }: { imageUrl: string | null }) {
  if (!imageUrl) return <div className="h-11 w-11 shrink-0 rounded-xl bg-black/10" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt="" loading="eager" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
  );
}
