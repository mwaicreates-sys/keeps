"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { EmptyState } from "@/components/EmptyState";
import { createGameSession, submitGameAnswer } from "@/services/games-client";
import { listGameSessions, getGameSession } from "@/services/games-read-client";
import { KEEP3_DROP2_PACK, randomFrom } from "@/lib/game-prompts";
import { SplitSquareVertical, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Session = Awaited<ReturnType<typeof listGameSessions>>[number];

export default function Keep3Drop2Page() {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = useCallback(async () => setSessions(await listGameSessions(space.id, "keep3_drop2")), [space.id]);
  useEffect(() => { refresh(); }, [refresh]);

  async function suggest() {
    const p = randomFrom(KEEP3_DROP2_PACK);
    await createGameSession({
      spaceId: space.id,
      createdBy: userId,
      otherMemberId: otherMember?.id ?? null,
      gameType: "keep3_drop2",
      topic: p.topic,
      category: p.category,
      prompt: { items: p.items },
    });
    show("Pick your 3.");
    refresh();
  }

  if (openId) return <PlayScreen sessionId={openId} onBack={() => { setOpenId(null); refresh(); }} />;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-1 font-display text-2xl">Keep 3, Drop 2</h1>
      <p className="mb-5 text-sm text-ink-soft">Five choices. Only three survive.</p>
      <button onClick={suggest} className="mb-6 w-full rounded-full bg-ink py-3 text-sm font-medium text-paper">Suggest a set</button>
      {sessions.length === 0 ? (
        <EmptyState icon={SplitSquareVertical} title="Nothing to choose from yet" />
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const answered = (s.game_answers as { user_id: string }[]).some((a) => a.user_id === userId);
            return (
              <li key={s.id}>
                <button onClick={() => setOpenId(s.id)} className="flex w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-left">
                  <span className="text-sm">{s.topic}</span>
                  <span className="text-xs text-ink-soft">{s.status === "completed" ? "Compare" : answered ? "Waiting" : "Choose"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PlayScreen({ sessionId, onBack }: { sessionId: string; onBack: () => void }) {
  const { userId, space, otherMember, members } = useSession();
  const [session, setSession] = useState<Session | null>(null);
  const [kept, setKept] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    const s = await getGameSession(sessionId);
    setSession(s as unknown as Session);
    const mine = (s.game_answers as unknown as { user_id: string; answer: { kept: string[] } }[]).find((a) => a.user_id === userId);
    if (mine) { setSubmitted(true); setKept(mine.answer.kept); }
  }, [sessionId, userId]);
  useEffect(() => { load(); }, [load]);

  if (!session) return null;
  const items = (session.prompt as { items: string[] }).items;
  const answers = session.game_answers as unknown as { user_id: string; answer: { kept: string[] } }[];
  const bothAnswered = answers.length >= 2;
  const result = (session.game_results as unknown as { result?: { overlap: string[]; overlapCount: number } }[])?.[0]?.result;

  function toggle(item: string) {
    if (submitted) return;
    setKept((prev) => {
      if (prev.includes(item)) return prev.filter((i) => i !== item);
      if (prev.length >= 3) return prev;
      return [...prev, item];
    });
  }

  async function submit() {
    if (kept.length !== 3) return;
    await submitGameAnswer({
      sessionId,
      userId,
      answer: { kept },
      spaceId: space.id,
      otherMemberId: otherMember?.id ?? null,
      gameType: "keep3_drop2",
      topic: session!.topic,
    });
    setSubmitted(true);
    load();
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <button onClick={onBack} className="mb-4 text-sm text-ink-soft">← Back</button>
      <h2 className="mb-5 text-center font-display text-xl">{session.topic}</h2>

      {!bothAnswered ? (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3">
            {items.map((item, i) => {
              const isKept = kept.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => toggle(item)}
                  disabled={submitted}
                  className={cn(
                    "relative flex h-28 items-center justify-center rounded-2xl border-2 p-3 text-center font-display text-base transition",
                    isKept ? "-translate-y-1 border-accent bg-accent-soft" : "border-line",
                    i === 4 && "col-span-2"
                  )}
                >
                  {isKept && <Check size={16} className="absolute right-2 top-2 text-accent" />}
                  {item}
                </button>
              );
            })}
          </div>
          {!submitted ? (
            <button
              onClick={submit}
              disabled={kept.length !== 3}
              className="w-full rounded-full bg-ink py-3 text-sm font-medium text-paper disabled:opacity-40"
            >
              Keep these {kept.length}/3
            </button>
          ) : (
            <p className="text-center text-sm text-ink-soft">Locked in. Waiting for {otherMember?.display_name ?? "them"}…</p>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {members.map((m) => {
            const list = answers.find((a) => a.user_id === m.id)?.answer.kept ?? [];
            return (
              <div key={m.id}>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
                  {m.id === userId ? "YOU KEPT" : `${m.display_name.toUpperCase()} KEPT`}
                </p>
                <p className="text-sm">{list.join(" · ")}</p>
              </div>
            );
          })}
          {result && (
            <div className="rounded-2xl border border-gold/40 bg-accent-soft/40 p-4 text-center">
              <p className="font-display text-lg">MATCH: {result.overlapCount}/3</p>
              {result.overlap.length > 0 && <p className="text-xs text-ink-soft">{result.overlap.join(", ")}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
