"use client";

import { useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { submitRunAnswer, StaleRunError } from "@/services/game-runs-client";
import { saveTop5List } from "@/services/top5-client";
import { playGame } from "@/lib/play-config";
import { RoundHeader } from "@/components/play/RoundHeader";
import { RoundTagline } from "@/components/play/RoundTagline";
import { RunWaitingForPartner } from "@/components/play/RunWaitingForPartner";
import { RunUnavailable } from "@/components/play/RunUnavailable";
import { getErrorMessage } from "@/lib/utils";
import type { RunResult } from "@/lib/game-run-result";
import type { RunStartResponse } from "@/services/game-runs-client";

const game = playGame("top5");

type NonNullRunStartResponse = RunStartResponse & { run: NonNullable<RunStartResponse["run"]> };

/** Today's Top 5 run -- a single free-text list submission (already
 * one action per round before this change; the daily-run model just
 * makes it the whole day's run instead of up to 5 per day). Top 5 has
 * no provider dependency (a plain hardcoded topic), so `initial.run`
 * is never actually null here -- guarded anyway for type safety and
 * consistency with the other three run screens. */
export function Top5RunScreen({ initial }: { initial: RunStartResponse }) {
  if (!initial.run) return <RunUnavailable icon={game.icon} bg={game.bg} iconColor={game.iconColor} label={game.label} />;
  return <Top5RunScreenInner initial={initial as NonNullRunStartResponse} />;
}

function Top5RunScreenInner({ initial }: { initial: NonNullRunStartResponse }) {
  const { userId, space } = useSession();
  const { show } = useToast();
  const prompt = (initial.run.questions as unknown as { topic: string; category: string }[])[0];

  const priorItems = (initial.mine?.answers as { items: string[] }[] | undefined)?.[0]?.items;
  const [items, setItems] = useState<string[]>(priorItems ?? ["", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(!!initial.mine?.completed_at);
  const [result, setResult] = useState<RunResult | null>(initial.result);

  async function submit() {
    const filled = items.map((i) => i.trim()).filter(Boolean);
    if (filled.length < 5) {
      show("Fill in all 5 before locking it in.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitRunAnswer(initial.run.id, { items: filled }, initial.run.questions_version);
      // sessionId intentionally omitted: game_runs rows aren't
      // game_sessions rows, and top5_lists.session_id's FK points at
      // game_sessions -- passing the run's id would violate it. The
      // column is nullable precisely for content with no legacy session.
      await saveTop5List({ spaceId: space.id, userId, topic: prompt.topic, items: filled }).catch(() => {});
      setCompleted(true);
      if (res.result) setResult(res.result);
    } catch (err) {
      if (err instanceof StaleRunError) {
        show("Today's set just updated -- refreshing…", "error");
        window.location.reload();
        return;
      }
      show(getErrorMessage(err, "Couldn't submit your list."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (completed) {
    if (result && result.kind === "top5") {
      return (
        <div className="mx-auto max-w-xl px-4 pb-6">
          <RoundHeader
            slug="top5"
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
            <div className="rounded-2xl bg-[#eaeafb] px-4 py-3 text-center">
              <p className="text-[15px] font-semibold text-[#5457c7]">{result.overlapPct}% overlap</p>
              <p className="mt-0.5 text-[12px] text-[#7c766c]">
                {result.samePosition} in the exact same spot
                {result.sharedItems.length > 0 && ` · ${result.sharedItems.length} shared`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Top5List label="You" items={result.mine} shared={result.sharedItems} />
              <Top5List label="Them" items={result.theirs} shared={result.sharedItems} />
            </div>
          </div>
          {game.tagline && game.taglineIcon && <RoundTagline text={game.tagline} icon={game.taglineIcon} />}
        </div>
      );
    }
    return (
      <RunWaitingForPartner icon={game.icon} bg={game.bg} iconColor={game.iconColor} headline="List locked in" partnerName={initial.partner?.display_name ?? null} />
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-6">
      <RoundHeader
        slug="top5"
        title={game.label}
        category={prompt.category}
        icon={game.icon}
        pillBg={game.bg}
        pillColor={game.iconColor}
        roundNumber={1}
        roundTotal={1}
        question={prompt.topic}
      />
      <div className="space-y-2.5">
        {items.map((val, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-2xl bg-[#f7f5f1] px-3.5 py-1">
            <span className="text-[13px] font-bold text-[#5457c7]">{i + 1}</span>
            <input
              value={val}
              onChange={(e) => setItems((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))}
              placeholder={`#${i + 1}`}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-[#3a362f] outline-none placeholder:text-[#a39d92]"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-2 w-full rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Lock it in"}
        </button>
      </div>
      {game.tagline && game.taglineIcon && <RoundTagline text={game.tagline} icon={game.taglineIcon} />}
    </div>
  );
}

function Top5List({ label, items, shared }: { label: string; items: string[]; shared: string[] }) {
  const sharedLower = shared.map((s) => s.toLowerCase());
  return (
    <div className="rounded-2xl bg-[#f7f5f1] p-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#a39d92]">{label}</p>
      <ol className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className={`truncate text-[12.5px] ${sharedLower.includes(item.toLowerCase()) ? "font-semibold text-[#2f8f52]" : "text-[#3a362f]"}`}>
            {i + 1}. {item}
          </li>
        ))}
      </ol>
    </div>
  );
}
