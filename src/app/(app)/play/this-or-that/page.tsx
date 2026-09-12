"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { BattleChoice } from "@/components/BattleChoice";
import { EmptyState } from "@/components/EmptyState";
import { createGameSession, submitGameAnswer } from "@/services/games-client";
import { listGameSessions, getGameSession } from "@/services/games-read-client";
import { THIS_OR_THAT_PACK, randomFrom } from "@/lib/game-prompts";
import { Swords, Sparkles } from "lucide-react";

type Session = Awaited<ReturnType<typeof listGameSessions>>[number];

export default function ThisOrThatPage() {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [customA, setCustomA] = useState("");
  const [customB, setCustomB] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const refresh = useCallback(async () => {
    setSessions(await listGameSessions(space.id, "this_or_that"));
  }, [space.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function suggest() {
    const p = randomFrom(THIS_OR_THAT_PACK);
    await createGameSession({
      spaceId: space.id,
      createdBy: userId,
      otherMemberId: otherMember?.id ?? null,
      gameType: "this_or_that",
      topic: `${p.optionA} or ${p.optionB}`,
      category: p.category,
      prompt: { optionA: p.optionA, optionB: p.optionB },
    });
    show("Sent. Waiting on both of you to answer.");
    refresh();
  }

  async function createCustom() {
    if (!customA.trim() || !customB.trim()) return;
    await createGameSession({
      spaceId: space.id,
      createdBy: userId,
      otherMemberId: otherMember?.id ?? null,
      gameType: "this_or_that",
      topic: `${customA} or ${customB}`,
      category: "Custom",
      prompt: { optionA: customA, optionB: customB },
    });
    setCustomA("");
    setCustomB("");
    setShowCustom(false);
    refresh();
  }

  if (openId) {
    return <PlayScreen sessionId={openId} onBack={() => { setOpenId(null); refresh(); }} />;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-1 font-display text-2xl">This or That</h1>
      <p className="mb-5 text-sm text-ink-soft">Answers stay private until you&apos;ve both picked.</p>

      <div className="mb-6 flex gap-2">
        <button onClick={suggest} className="flex-1 rounded-full bg-ink py-3 text-sm font-medium text-paper">
          Suggest one
        </button>
        <button
          onClick={() => setShowCustom((s) => !s)}
          className="flex-1 rounded-full border border-line py-3 text-sm font-medium"
        >
          Create custom
        </button>
      </div>

      {showCustom && (
        <div className="mb-6 space-y-2 rounded-2xl border border-line p-3.5">
          <input value={customA} onChange={(e) => setCustomA(e.target.value)} placeholder="Option A" className="w-full rounded-xl border border-line px-3 py-2 text-sm" />
          <input value={customB} onChange={(e) => setCustomB(e.target.value)} placeholder="Option B" className="w-full rounded-xl border border-line px-3 py-2 text-sm" />
          <button onClick={createCustom} className="w-full rounded-full bg-accent py-2 text-sm font-medium text-white">Send challenge</button>
        </div>
      )}

      {sessions.length === 0 ? (
        <EmptyState icon={Swords} title="No battles yet" body="Suggest one to get started." />
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const answered = (s.game_answers as { user_id: string }[]).some((a) => a.user_id === userId);
            return (
              <li key={s.id}>
                <button
                  onClick={() => setOpenId(s.id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-left"
                >
                  <span className="text-sm">{s.topic}</span>
                  <span className="flex items-center gap-1 text-xs text-ink-soft">
                    {s.status === "completed" && <Sparkles size={12} className="text-gold" />}
                    {s.status === "completed" ? "Compare" : answered ? "Waiting" : "Answer"}
                  </span>
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
  const [choice, setChoice] = useState<"A" | "B" | null>(null);

  const load = useCallback(async () => {
    const s = await getGameSession(sessionId);
    setSession(s as unknown as Session);
    const mine = (s.game_answers as unknown as { user_id: string; answer: { choice: "A" | "B" } }[]).find((a) => a.user_id === userId);
    if (mine) setChoice(mine.answer.choice);
  }, [sessionId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!session) return null;
  const prompt = session.prompt as { optionA: string; optionB: string };
  const answers = session.game_answers as unknown as { user_id: string; answer: { choice: "A" | "B" } }[];
  const bothAnswered = answers.length >= 2;
  const result = (session.game_results as unknown as { result?: Record<string, string> }[])?.[0]?.result;

  async function pick(c: "A" | "B") {
    setChoice(c);
    await submitGameAnswer({
      sessionId,
      userId,
      answer: { choice: c },
      spaceId: space.id,
      otherMemberId: otherMember?.id ?? null,
      gameType: "this_or_that",
      topic: session!.topic,
    });
    load();
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 text-center">
      <button onClick={onBack} className="mb-4 text-sm text-ink-soft">← Back</button>
      <p className="mb-2 text-xs uppercase tracking-wide text-ink-soft">{session.category}</p>
      <BattleChoice
        optionA={prompt.optionA}
        optionB={prompt.optionB}
        selected={choice}
        revealed={bothAnswered}
        onSelect={choice ? undefined : pick}
      />
      {!bothAnswered && choice && <p className="text-sm text-ink-soft">Waiting for {otherMember?.display_name ?? "them"} to answer…</p>}
      {bothAnswered && result && (
        <div className="mt-4 space-y-2">
          <p className={`font-display text-xl ${result.matched ? "text-ok" : "text-accent"}`}>
            {result.matched ? "MATCHED" : "DIFFERENT"}
          </p>
          {members.map((m) => (
            <p key={m.id} className="text-sm text-ink-soft">
              {m.id === userId ? "You" : m.display_name} chose {result[m.id] === "A" ? prompt.optionA : prompt.optionB}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
