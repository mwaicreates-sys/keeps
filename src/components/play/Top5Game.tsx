"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X as XIcon, ListOrdered } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createGameSession, submitGameAnswer } from "@/services/games-client";
import { getGameSession } from "@/services/games-read-client";
import { saveTop5List } from "@/services/top5-client";
import { TOP5_PACK, randomFrom } from "@/lib/game-prompts";
import { getErrorMessage, timeAgo } from "@/lib/utils";
import { GameHeader } from "@/components/play/GameHeader";
import { EmptyState } from "@/components/EmptyState";
import { sessionStatus, type GameSessionRow } from "@/lib/game-types";

type Prompt = { topic: string; category: string };
type Result = { sharedItems: string[]; samePosition: number; overlapPct: number; [userId: string]: unknown };

export function Top5Game({ sessions }: { sessions: GameSessionRow[] }) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const [active, setActive] = useState<GameSessionRow | null>(null);
  const [items, setItems] = useState<string[]>(["", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);

  async function startNew() {
    setStarting(true);
    try {
      const prompt = randomFrom(TOP5_PACK);
      const session = await createGameSession({
        spaceId: space.id,
        createdBy: userId,
        otherMemberId: otherMember?.id ?? null,
        gameType: "top5",
        topic: prompt.topic,
        category: prompt.category,
        prompt,
      });
      setActive({ ...session, game_answers: [], game_results: null } as GameSessionRow);
      setItems(["", "", "", "", ""]);
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't start a new round."), "error");
    } finally {
      setStarting(false);
    }
  }

  async function submit() {
    if (!active) return;
    const filled = items.map((i) => i.trim()).filter(Boolean);
    if (filled.length < 5) {
      show("Fill in all 5 before locking it in.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await submitGameAnswer({
        sessionId: active.id,
        userId,
        answer: { items: filled },
        spaceId: space.id,
        otherMemberId: otherMember?.id ?? null,
        gameType: "top5",
        topic: active.topic,
      });
      // Also kept as a standalone, exportable list beyond the game_answers blob.
      await saveTop5List({ spaceId: space.id, sessionId: active.id, userId, topic: active.topic, items: filled }).catch(() => {});
      const fresh = await getGameSession(active.id);
      setActive(fresh as unknown as GameSessionRow);
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't submit your list."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (active) {
    const prompt = active.prompt as unknown as Prompt;
    const answeredByMe = active.game_answers.some((a) => a.user_id === userId);
    const result = active.game_results?.result as Result | undefined;

    return (
      <div className="mx-auto max-w-xl px-4 pb-6">
        <div className="mb-4 flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => setActive(null)}
            aria-label="Back"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#3a362f] shadow-sm"
          >
            <XIcon size={20} />
          </button>
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[#a39d92]">{prompt.category}</p>
            <p className="truncate text-[19px] font-bold text-[#3a362f]">{active.topic}</p>
          </div>
        </div>

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
              {otherMember && (
                <Top5List label={otherMember.display_name} items={result[otherMember.id] as string[]} shared={result.sharedItems} />
              )}
            </div>
          </div>
        ) : answeredByMe ? (
          <div className="rounded-2xl bg-[#f7f5f1] px-4 py-8 text-center">
            <p className="text-[15px] font-semibold text-[#3a362f]">List locked in</p>
            <p className="mt-1 text-[13px] text-[#a39d92]">
              Waiting on {otherMember?.display_name ?? "your partner"} to finish theirs.
            </p>
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
      </div>
    );
  }

  return (
    <div>
      <GameHeader title="My Top 5" subtitle="Rank it. Compare lists." />
      <div className="px-4 pb-5">
        <button
          type="button"
          onClick={startNew}
          disabled={starting}
          className="w-full rounded-2xl bg-[#3a362f] py-4 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {starting ? "Starting…" : "New Top 5"}
        </button>
      </div>
      <div className="px-4">
        {sessions.length === 0 ? (
          <EmptyState icon={ListOrdered} title="No lists yet" body="Start one above and see how your rankings compare." />
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} onOpen={() => setActive(s)} />
            ))}
          </ul>
        )}
      </div>
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
          <li
            key={i}
            className={`truncate text-[12.5px] ${sharedLower.includes(item.toLowerCase()) ? "font-semibold text-[#2f8f52]" : "text-[#3a362f]"}`}
          >
            {i + 1}. {item}
          </li>
        ))}
      </ol>
    </div>
  );
}

function SessionRow({ session, onOpen }: { session: GameSessionRow; onOpen: () => void }) {
  const { userId } = useSession();
  const status = sessionStatus(session, userId);
  const result = session.game_results?.result as { overlapPct?: number } | undefined;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]"
      >
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-[#3a362f]">{session.topic}</p>
          <p className="text-[11.5px] text-[#a39d92]">{timeAgo(session.created_at)}</p>
        </div>
        {status === "completed" ? (
          <span className="shrink-0 rounded-full bg-[#eaeafb] px-2.5 py-1 text-[11px] font-semibold text-[#5457c7]">
            {result?.overlapPct ?? 0}% overlap
          </span>
        ) : status === "waiting" ? (
          <span className="shrink-0 rounded-full bg-[#f2efe9] px-2.5 py-1 text-[11px] font-medium text-[#a39d92]">Waiting</span>
        ) : (
          <span className="shrink-0 rounded-full bg-[#faf1e2] px-2.5 py-1 text-[11px] font-semibold text-[#a3742b]">Your turn</span>
        )}
      </button>
    </li>
  );
}
