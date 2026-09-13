"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createGameSession, submitGameAnswer, DailyCapReachedError } from "@/services/games-client";
import { getGameSession } from "@/services/games-read-client";
import { saveTop5List } from "@/services/top5-client";
import { pickTop5Prompt, type Top5Prompt } from "@/lib/top5-prompt";
import { usePollForResult } from "@/hooks/usePollForResult";
import { playGame } from "@/lib/play-config";
import { RoundHeader } from "@/components/play/RoundHeader";
import { DAILY_PLAY_CAP } from "@/lib/game-types";
import { RoundTagline } from "@/components/play/RoundTagline";
import { getErrorMessage } from "@/lib/utils";
import type { GameSessionRow } from "@/lib/game-types";

const game = playGame("top5");

type Result = { sharedItems: string[]; samePosition: number; overlapPct: number; [userId: string]: unknown };

/** The real gameplay screen for one Top 5 round -- lives at
 * /play/top5/[sessionId], distinct from the history list at
 * /play/history. */
export function Top5Round({ session: initialSession, roundNumber }: { session: GameSessionRow; roundNumber: number }) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [items, setItems] = useState<string[]>(["", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [startingNext, setStartingNext] = useState(false);

  const prompt = session.prompt as unknown as Top5Prompt;
  const answeredByMe = session.game_answers.some((a) => a.user_id === userId);
  const result = session.game_results?.result as Result | undefined;

  usePollForResult(session.id, answeredByMe && !result, (fresh) => setSession(fresh));

  async function submit() {
    const filled = items.map((i) => i.trim()).filter(Boolean);
    if (filled.length < 5) {
      show("Fill in all 5 before locking it in.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await submitGameAnswer({
        sessionId: session.id,
        userId,
        answer: { items: filled },
        spaceId: space.id,
        otherMemberId: otherMember?.id ?? null,
        gameType: "top5",
        topic: session.topic,
      });
      await saveTop5List({ spaceId: space.id, sessionId: session.id, userId, topic: session.topic, items: filled }).catch(() => {});
      const fresh = await getGameSession(session.id);
      setSession(fresh as unknown as GameSessionRow);
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't submit your list."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function nextRound() {
    setStartingNext(true);
    try {
      const next = await pickTop5Prompt();
      const created = await createGameSession({
        spaceId: space.id,
        createdBy: userId,
        otherMemberId: otherMember?.id ?? null,
        gameType: "top5",
        topic: next.topic,
        category: next.category,
        prompt: next,
      });
      router.push(`/play/top5/${created.id}`);
    } catch (err) {
      if (err instanceof DailyCapReachedError) {
        router.push("/play/top5");
        return;
      }
      show(getErrorMessage(err, "Couldn't start the next round."), "error");
      setStartingNext(false);
    }
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
        roundNumber={roundNumber}
        roundTotal={DAILY_PLAY_CAP}
        question={session.topic}
      />

      {result ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-[#eaeafb] px-4 py-3 text-center">
            <p className="text-[15px] font-semibold text-[#5457c7]">{result.overlapPct}% overlap</p>
            <p className="mt-0.5 text-[12px] text-[#7c766c]">
              {result.samePosition} in the exact same spot
              {result.sharedItems.length > 0 && ` · ${result.sharedItems.length} shared`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Top5List label="You" items={result[userId] as string[]} shared={result.sharedItems} />
            {otherMember && <Top5List label={otherMember.display_name} items={result[otherMember.id] as string[]} shared={result.sharedItems} />}
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
          <p className="text-[15px] font-semibold text-[#3a362f]">List locked in</p>
          <p className="mt-1 text-[13px] text-[#a39d92]">Waiting on {otherMember?.display_name ?? "your partner"} to finish theirs.</p>
        </div>
      ) : (
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
      )}

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
