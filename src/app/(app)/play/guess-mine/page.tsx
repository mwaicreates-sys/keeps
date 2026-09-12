"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { BattleChoice } from "@/components/BattleChoice";
import { EmptyState } from "@/components/EmptyState";
import { createGameSession, submitGameAnswer } from "@/services/games-client";
import { listGameSessions, getGameSession } from "@/services/games-read-client";
import { GUESS_MINE_PACK, randomFrom } from "@/lib/game-prompts";
import { HelpCircle } from "lucide-react";

type Session = Awaited<ReturnType<typeof listGameSessions>>[number];

export default function GuessMinePage() {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = useCallback(async () => setSessions(await listGameSessions(space.id, "guess_mine")), [space.id]);
  useEffect(() => { refresh(); }, [refresh]);

  async function suggest() {
    const p = randomFrom(GUESS_MINE_PACK);
    await createGameSession({
      spaceId: space.id,
      createdBy: userId,
      otherMemberId: otherMember?.id ?? null,
      gameType: "guess_mine",
      topic: p.question,
      category: p.category,
      prompt: { question: p.question, optionA: p.optionA, optionB: p.optionB },
    });
    show("Answer it yourself first — then they'll try to guess you.");
    refresh();
  }

  if (openId) return <PlayScreen sessionId={openId} onBack={() => { setOpenId(null); refresh(); }} />;

  const correct = sessions.filter((s) => {
    const r = (s.game_results as unknown as { result?: { matched?: boolean } }[])?.[0]?.result;
    return r?.matched;
  }).length;
  const completed = sessions.filter((s) => s.status === "completed").length;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-1 font-display text-2xl">Guess Mine</h1>
      <p className="mb-1 text-sm text-ink-soft">How well do you know them?</p>
      {completed > 0 && <p className="mb-5 text-xs text-gold">Score: {correct}/{completed} correct guesses</p>}

      <button onClick={suggest} className="mb-6 w-full rounded-full bg-ink py-3 text-sm font-medium text-paper">
        New question
      </button>

      {sessions.length === 0 ? (
        <EmptyState icon={HelpCircle} title="No questions yet" body="Start one — you&apos;ll answer first." />
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const iAmCreator = s.created_by === userId;
            const answered = (s.game_answers as { user_id: string }[]).some((a) => a.user_id === userId);
            return (
              <li key={s.id}>
                <button onClick={() => setOpenId(s.id)} className="flex w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-left">
                  <span className="text-sm">{s.topic}</span>
                  <span className="text-xs text-ink-soft">
                    {s.status === "completed" ? "Revealed" : answered ? "Waiting" : iAmCreator ? "Answer yours" : "Guess"}
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
  const { userId, space, otherMember } = useSession();
  const [session, setSession] = useState<Session | null>(null);
  const [choice, setChoice] = useState<"A" | "B" | null>(null);

  const load = useCallback(async () => {
    const s = await getGameSession(sessionId);
    setSession(s as unknown as Session);
    const mine = (s.game_answers as unknown as { user_id: string; answer: { choice: "A" | "B" } }[]).find((a) => a.user_id === userId);
    if (mine) setChoice(mine.answer.choice);
  }, [sessionId, userId]);
  useEffect(() => { load(); }, [load]);

  if (!session) return null;
  const prompt = session.prompt as { question: string; optionA: string; optionB: string };
  const iAmCreator = session.created_by === userId;
  const answers = session.game_answers as unknown as { user_id: string; answer: { choice: "A" | "B" } }[];
  const creatorAnswered = answers.some((a) => a.user_id === session.created_by);
  const bothAnswered = answers.length >= 2;
  const result = (session.game_results as unknown as { result?: Record<string, string> }[])?.[0]?.result;

  const canAnswerNow = iAmCreator ? !choice : creatorAnswered && !choice;

  async function pick(c: "A" | "B") {
    setChoice(c);
    await submitGameAnswer({
      sessionId,
      userId,
      answer: { choice: c },
      spaceId: space.id,
      otherMemberId: otherMember?.id ?? null,
      gameType: "guess_mine",
      topic: session!.topic,
    });
    load();
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 text-center">
      <button onClick={onBack} className="mb-4 text-sm text-ink-soft">← Back</button>
      <p className="mb-2 font-display text-lg">{prompt.question}</p>
      {!iAmCreator && !creatorAnswered ? (
        <p className="text-sm text-ink-soft">Waiting for them to answer their own question first…</p>
      ) : (
        <BattleChoice
          optionA={prompt.optionA}
          optionB={prompt.optionB}
          selected={choice}
          revealed={bothAnswered}
          onSelect={canAnswerNow ? pick : undefined}
        />
      )}
      {choice && !bothAnswered && <p className="text-sm text-ink-soft">Saved. Check back once they&apos;ve gone.</p>}
      {bothAnswered && result && (
        <div className="mt-4 space-y-1">
          <p className={`font-display text-xl ${result.matched ? "text-ok" : "text-accent"}`}>
            {result.matched ? "Correct!" : "Wrong guess"}
          </p>
          <p className="text-sm text-ink-soft">
            They chose {result[session.created_by] === "A" ? prompt.optionA : prompt.optionB}
          </p>
        </div>
      )}
    </div>
  );
}
