"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X as XIcon, HelpCircle } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createGameSession, submitGameAnswer, type GameType } from "@/services/games-client";
import { getGameSession } from "@/services/games-read-client";
import { fetchMusicPool } from "@/services/music-pool-client";
import { MUSIC_CATEGORY } from "@/lib/play-music-categories";
import { THIS_OR_THAT_PACK, GUESS_MINE_PACK, randomFrom } from "@/lib/game-prompts";
import { getErrorMessage, timeAgo } from "@/lib/utils";
import { GameHeader } from "@/components/play/GameHeader";
import { EmptyState } from "@/components/EmptyState";
import { sessionStatus, type GameSessionRow } from "@/lib/game-types";

type Prompt = {
  topic: string;
  category: string;
  optionA: string;
  optionB: string;
  /** Only present for a real, provider-backed matchup (e.g. two
   * MusicBrainz artists) -- when set, the round renders as large image
   * cards instead of text pills. */
  imageA?: string | null;
  imageB?: string | null;
  /** The provider items' own ids, stored so future rounds can exclude
   * them (see /api/play/music-pool's recently-used lookup). */
  items?: { id: string; title: string }[];
};

async function pickPrompt(
  gameType: "this_or_that" | "guess_mine",
  spaceId: string
): Promise<Prompt> {
  // This or That gets a real, image-first music matchup part of the
  // time -- mixed in with the existing hardcoded categories rather than
  // replacing them, so the game still covers movies/football/food/etc.
  if (gameType === "this_or_that" && Math.random() < 0.5) {
    const pool = await fetchMusicPool("artist", 2, spaceId);
    if (pool.items.length === 2) {
      const [a, b] = pool.items;
      return {
        topic: `${a.title} or ${b.title}`,
        category: MUSIC_CATEGORY.artist,
        optionA: a.title,
        optionB: b.title,
        imageA: a.imageUrl,
        imageB: b.imageUrl,
        items: pool.items.map((i) => ({ id: i.id, title: i.title })),
      };
    }
  }

  if (gameType === "guess_mine") {
    const p = randomFrom(GUESS_MINE_PACK);
    return { topic: p.question, category: p.category, optionA: p.optionA, optionB: p.optionB };
  }
  const p = randomFrom(THIS_OR_THAT_PACK);
  return { topic: `${p.optionA} or ${p.optionB}`, category: p.category, optionA: p.optionA, optionB: p.optionB };
}

/**
 * Shared implementation for This or That and Guess Mine — both boil down
 * to the same mechanic (each of you privately picks A or B, then you see
 * whether you matched), just different prompt packs and framing copy.
 * `sessions` comes from the server page load; a mutation here (starting
 * or answering a round) triggers router.refresh() so that list catches up
 * once the player backs out of the active round.
 */
export function ChoiceGame({
  gameType,
  title,
  subtitle,
  ctaLabel,
  sessions,
}: {
  gameType: "this_or_that" | "guess_mine";
  title: string;
  subtitle: string;
  ctaLabel: string;
  sessions: GameSessionRow[];
}) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const [active, setActive] = useState<GameSessionRow | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);

  async function startNew() {
    setStarting(true);
    try {
      const prompt = await pickPrompt(gameType, space.id);
      const session = await createGameSession({
        spaceId: space.id,
        createdBy: userId,
        otherMemberId: otherMember?.id ?? null,
        gameType,
        topic: prompt.topic,
        category: prompt.category,
        prompt,
      });
      setActive({ ...session, game_answers: [], game_results: null } as GameSessionRow);
      setChoice(null);
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't start a new round."), "error");
    } finally {
      setStarting(false);
    }
  }

  async function submit() {
    if (!active || !choice) return;
    setSubmitting(true);
    try {
      await submitGameAnswer({
        sessionId: active.id,
        userId,
        answer: { choice },
        spaceId: space.id,
        otherMemberId: otherMember?.id ?? null,
        gameType: gameType as GameType,
        topic: active.topic,
      });
      const fresh = await getGameSession(active.id);
      setActive(fresh as unknown as GameSessionRow);
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't submit your answer."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (active) {
    const prompt = active.prompt as unknown as Prompt;
    const answeredByMe = active.game_answers.some((a) => a.user_id === userId);
    const result = active.game_results?.result as
      | { matched: boolean; [userId: string]: unknown }
      | undefined;
    const isVisual = !!(prompt.imageA || prompt.imageB);

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
            <p className="truncate text-[19px] font-bold text-[#3a362f]">{prompt.topic}</p>
          </div>
        </div>

        {result ? (
          <div className="space-y-3">
            <div
              className={`rounded-2xl px-4 py-3 text-center text-[15px] font-semibold ${
                result.matched ? "bg-[#e6f2e9] text-[#2f8f52]" : "bg-[#fdecec] text-[#c23a3a]"
              }`}
            >
              {result.matched ? "You matched! 🎉" : "You picked differently"}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ChoiceResultCard
                label="You"
                value={result[userId] as string}
                imageUrl={imageForValue(prompt, result[userId] as string)}
              />
              {otherMember && (
                <ChoiceResultCard
                  label={otherMember.display_name}
                  value={result[otherMember.id] as string}
                  imageUrl={imageForValue(prompt, result[otherMember.id] as string)}
                />
              )}
            </div>
          </div>
        ) : answeredByMe ? (
          <div className="rounded-2xl bg-[#f7f5f1] px-4 py-8 text-center">
            <p className="text-[15px] font-semibold text-[#3a362f]">Answer locked in</p>
            <p className="mt-1 text-[13px] text-[#a39d92]">
              Waiting on {otherMember?.display_name ?? "your partner"} to answer too.
            </p>
          </div>
        ) : isVisual ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: prompt.optionA, image: prompt.imageA },
                { label: prompt.optionB, image: prompt.imageB },
              ].map(({ label, image }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setChoice(label)}
                  className={`overflow-hidden rounded-[22px] text-left transition ${
                    choice === label ? "scale-[0.98] ring-[3px] ring-[#3a362f]" : choice ? "opacity-60" : ""
                  }`}
                >
                  <div className="relative aspect-square w-full bg-[#f2efe9]">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[#a39d92]">
                        <HelpCircle size={28} />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-6">
                      <p className="truncate text-[14px] font-bold text-white">{label}</p>
                    </div>
                    {choice === label && (
                      <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-[#3a362f]">
                        <Check size={15} />
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!choice || submitting}
              className="w-full rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Lock it in"}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {[prompt.optionA, prompt.optionB].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setChoice(opt)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-[15.5px] font-semibold transition ${
                  choice === opt ? "bg-[#3a362f] text-white" : "bg-[#f7f5f1] text-[#3a362f]"
                }`}
              >
                {opt}
                {choice === opt && <Check size={18} />}
              </button>
            ))}
            <button
              type="button"
              onClick={submit}
              disabled={!choice || submitting}
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
      <GameHeader title={title} subtitle={subtitle} />

      <div className="px-4 pb-5">
        <button
          type="button"
          onClick={startNew}
          disabled={starting}
          className="w-full rounded-2xl bg-[#3a362f] py-4 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {starting ? "Starting…" : ctaLabel}
        </button>
      </div>

      <div className="px-4">
        {sessions.length === 0 ? (
          <EmptyState icon={HelpCircle} title="No rounds yet" body="Start one above to see how you match up." />
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

function imageForValue(prompt: Prompt, value: string): string | null | undefined {
  if (value === prompt.optionA) return prompt.imageA;
  if (value === prompt.optionB) return prompt.imageB;
  return undefined;
}

function ChoiceResultCard({ label, value, imageUrl }: { label: string; value: string; imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      <div className="overflow-hidden rounded-2xl bg-[#f7f5f1]">
        <div className="relative aspect-square w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/75">{label}</p>
            <p className="truncate text-[13px] font-bold text-white">{value}</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-[#f7f5f1] px-4 py-4 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a39d92]">{label}</p>
      <p className="mt-1 text-[15px] font-bold text-[#3a362f]">{value}</p>
    </div>
  );
}

function SessionRow({ session, onOpen }: { session: GameSessionRow; onOpen: () => void }) {
  const { userId } = useSession();
  const status = sessionStatus(session, userId);
  const result = session.game_results?.result as { matched?: boolean } | undefined;

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
        <StatusChip status={status} matched={result?.matched} />
      </button>
    </li>
  );
}

function StatusChip({ status, matched }: { status: "completed" | "waiting" | "your_turn"; matched?: boolean }) {
  if (status === "completed") {
    return (
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          matched ? "bg-[#e6f2e9] text-[#2f8f52]" : "bg-[#fdecec] text-[#c23a3a]"
        }`}
      >
        {matched ? "Matched" : "Different"}
      </span>
    );
  }
  if (status === "waiting") {
    return <span className="shrink-0 rounded-full bg-[#f2efe9] px-2.5 py-1 text-[11px] font-medium text-[#a39d92]">Waiting</span>;
  }
  return <span className="shrink-0 rounded-full bg-[#faf1e2] px-2.5 py-1 text-[11px] font-semibold text-[#a3742b]">Your turn</span>;
}
