"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { EmptyState } from "@/components/EmptyState";
import { createGameSession, submitGameAnswer } from "@/services/games-client";
import { listGameSessions, getGameSession } from "@/services/games-read-client";
import { BLIND_RANK_PACK, randomFrom } from "@/lib/game-prompts";
import { EyeOff } from "lucide-react";

type Session = Awaited<ReturnType<typeof listGameSessions>>[number];

export default function BlindRankPage() {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = useCallback(async () => setSessions(await listGameSessions(space.id, "blind_rank")), [space.id]);
  useEffect(() => { refresh(); }, [refresh]);

  async function suggest() {
    const p = randomFrom(BLIND_RANK_PACK);
    await createGameSession({
      spaceId: space.id,
      createdBy: userId,
      otherMemberId: otherMember?.id ?? null,
      gameType: "blind_rank",
      topic: p.topic,
      category: p.category,
      prompt: { items: p.items },
    });
    show("Rank each one as it appears — no going back.");
    refresh();
  }

  if (openId) return <PlayScreen sessionId={openId} onBack={() => { setOpenId(null); refresh(); }} />;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-1 font-display text-2xl">Blind Rank</h1>
      <p className="mb-5 text-sm text-ink-soft">See one item at a time. Lock in its rank before the next appears.</p>
      <button onClick={suggest} className="mb-6 w-full rounded-full bg-ink py-3 text-sm font-medium text-paper">Suggest a set</button>
      {sessions.length === 0 ? (
        <EmptyState icon={EyeOff} title="Nothing to rank yet" />
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
  const [cursor, setCursor] = useState(0);
  const [ranking, setRanking] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    const s = await getGameSession(sessionId);
    setSession(s as unknown as Session);
    const mine = (s.game_answers as unknown as { user_id: string; answer: { ranking: Record<string, number> } }[]).find((a) => a.user_id === userId);
    if (mine) { setSubmitted(true); setRanking(mine.answer.ranking); }
  }, [sessionId, userId]);
  useEffect(() => { load(); }, [load]);

  if (!session) return null;
  const items = (session.prompt as { items: string[] }).items;
  const answers = session.game_answers as unknown as { user_id: string; answer: { ranking: Record<string, number> } }[];
  const bothAnswered = answers.length >= 2;
  const usedRanks = new Set(Object.values(ranking));

  async function assign(rank: number) {
    const item = items[cursor];
    const next = { ...ranking, [item]: rank };
    setRanking(next);
    if (cursor < items.length - 1) {
      setCursor(cursor + 1);
    } else {
      await submitGameAnswer({
        sessionId,
        userId,
        answer: { ranking: next },
        spaceId: space.id,
        otherMemberId: otherMember?.id ?? null,
        gameType: "blind_rank",
        topic: session!.topic,
      });
      setSubmitted(true);
      load();
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 text-center">
      <button onClick={onBack} className="mb-4 text-left text-sm text-ink-soft">← Back</button>
      <h2 className="mb-6 font-display text-xl">{session.topic}</h2>

      {!submitted ? (
        <>
          <div className="mb-6 flex h-40 items-center justify-center rounded-3xl border-2 border-dashed border-accent/40 bg-accent-soft/30">
            <p className="font-display text-2xl">{items[cursor]}</p>
          </div>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                disabled={usedRanks.has(r)}
                onClick={() => assign(r)}
                className="grid h-12 w-12 place-items-center rounded-full border border-line font-display text-lg disabled:opacity-25"
              >
                {r}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-soft">{cursor + 1} of {items.length}</p>
        </>
      ) : !bothAnswered ? (
        <p className="text-sm text-ink-soft">Locked in. Waiting for {otherMember?.display_name ?? "them"}…</p>
      ) : (
        <div className="space-y-4 text-left">
          {members.map((m) => {
            const r = answers.find((a) => a.user_id === m.id)?.answer.ranking ?? {};
            const sorted = Object.entries(r).sort((a, b) => a[1] - b[1]);
            return (
              <div key={m.id}>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-soft">{m.id === userId ? "You" : m.display_name}</p>
                <ol className="space-y-1">
                  {sorted.map(([item, rank]) => (
                    <li key={item} className="rounded-lg bg-paper-raised px-3 py-1.5 text-sm">{rank}. {item}</li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
