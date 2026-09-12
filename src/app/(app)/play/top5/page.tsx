"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { EmptyState } from "@/components/EmptyState";
import { createGameSession, submitGameAnswer } from "@/services/games-client";
import { listGameSessions, getGameSession } from "@/services/games-read-client";
import { saveTop5List } from "@/services/top5-client";
import { TOP5_PACK, randomFrom } from "@/lib/game-prompts";
import { ListOrdered, GripVertical } from "lucide-react";

type Session = Awaited<ReturnType<typeof listGameSessions>>[number];

export default function Top5Page() {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState("");

  const refresh = useCallback(async () => setSessions(await listGameSessions(space.id, "top5")), [space.id]);
  useEffect(() => { refresh(); }, [refresh]);

  async function start(topic: string, category: string) {
    await createGameSession({
      spaceId: space.id,
      createdBy: userId,
      otherMemberId: otherMember?.id ?? null,
      gameType: "top5",
      topic,
      category,
      prompt: { topic },
    });
    show("Build your list — it stays hidden until you both submit.");
    refresh();
  }

  if (openId) return <PlayScreen sessionId={openId} onBack={() => { setOpenId(null); refresh(); }} />;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-1 font-display text-2xl">My Top 5</h1>
      <p className="mb-5 text-sm text-ink-soft">Rank it your way. Compare once you&apos;ve both submitted.</p>

      <button
        onClick={() => start(randomFrom(TOP5_PACK).topic, randomFrom(TOP5_PACK).category)}
        className="mb-3 w-full rounded-full bg-ink py-3 text-sm font-medium text-paper"
      >
        Suggest a topic
      </button>
      <div className="mb-6 flex gap-2">
        <input
          value={customTopic}
          onChange={(e) => setCustomTopic(e.target.value)}
          placeholder="Top 5 ___"
          className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm"
        />
        <button
          onClick={() => customTopic.trim() && (start(customTopic.trim(), "Custom"), setCustomTopic(""))}
          className="rounded-full border border-line px-4 text-sm font-medium"
        >
          Send
        </button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon={ListOrdered} title="No lists yet" body="Suggest a topic to get started." />
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const answered = (s.game_answers as { user_id: string }[]).some((a) => a.user_id === userId);
            return (
              <li key={s.id}>
                <button onClick={() => setOpenId(s.id)} className="flex w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-left">
                  <span className="text-sm">{s.topic}</span>
                  <span className="text-xs text-ink-soft">{s.status === "completed" ? "Compare" : answered ? "Waiting" : "Rank it"}</span>
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
  const [items, setItems] = useState<string[]>(["", "", "", "", ""]);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    const s = await getGameSession(sessionId);
    setSession(s as unknown as Session);
    const mine = (s.game_answers as { user_id: string }[]).find((a) => a.user_id === userId);
    if (mine) setSubmitted(true);
  }, [sessionId, userId]);
  useEffect(() => { load(); }, [load]);

  if (!session) return null;
  const answers = session.game_answers as unknown as { user_id: string; answer: { items: string[] } }[];
  const bothAnswered = answers.length >= 2;
  const result = (session.game_results as unknown as { result?: { sharedItems: string[]; samePosition: number; overlapPct: number } }[])?.[0]?.result;

  async function submit() {
    const clean = items.map((i) => i.trim()).filter(Boolean);
    if (clean.length < 5) return;
    await submitGameAnswer({
      sessionId,
      userId,
      answer: { items: clean },
      spaceId: space.id,
      otherMemberId: otherMember?.id ?? null,
      gameType: "top5",
      topic: session!.topic,
    });
    await saveTop5List({ spaceId: space.id, sessionId, userId, topic: session!.topic, items: clean });
    setSubmitted(true);
    load();
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <button onClick={onBack} className="mb-4 text-sm text-ink-soft">← Back</button>
      <h2 className="mb-5 font-display text-xl">{session.topic}</h2>

      {!submitted ? (
        <div className="space-y-2">
          {items.map((val, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-line px-3 py-1">
              <span className="font-display text-lg text-accent">{i + 1}</span>
              <GripVertical size={14} className="text-ink-soft" />
              <input
                value={val}
                onChange={(e) => setItems((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))}
                placeholder={`#${i + 1}`}
                className="flex-1 py-2 text-sm outline-none"
              />
            </div>
          ))}
          <button onClick={submit} className="mt-3 w-full rounded-full bg-ink py-3 text-sm font-medium text-paper">
            Submit list
          </button>
        </div>
      ) : !bothAnswered ? (
        <p className="text-center text-sm text-ink-soft">Locked in. Waiting for {otherMember?.display_name ?? "them"}…</p>
      ) : (
        <div className="space-y-4">
          {members.map((m) => {
            const list = answers.find((a) => a.user_id === m.id)?.answer.items ?? [];
            return (
              <div key={m.id}>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
                  {m.id === userId ? "You" : m.display_name}
                </p>
                <ol className="space-y-1">
                  {list.map((item, i) => (
                    <li key={i} className="rounded-lg bg-paper-raised px-3 py-1.5 text-sm">
                      {i + 1}. {item}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
          {result && (
            <div className="rounded-2xl border border-gold/40 bg-accent-soft/40 p-4 text-center">
              <p className="font-display text-lg">{result.overlapPct}% overlap</p>
              <p className="text-xs text-ink-soft">{result.samePosition} in the exact same spot</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
