"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createGameSession, submitGameAnswer } from "@/services/games-client";
import { getGameSession } from "@/services/games-read-client";
import { prefetchMusicPool } from "@/services/music-pool-client";
import { pickBlindRankPrompt, BLIND_RANK_ROUND_SIZE, type BlindRankPrompt } from "@/lib/blind-rank-prompt";
import { playGame } from "@/lib/play-config";
import { RoundHeader } from "@/components/play/RoundHeader";
import { RoundTagline } from "@/components/play/RoundTagline";
import { getErrorMessage } from "@/lib/utils";
import type { GameSessionRow } from "@/lib/game-types";

type Result = { matches: number; [userId: string]: unknown };

const game = playGame("blind-rank");

/** The real gameplay screen for one Blind Rank round -- lives at
 * /play/blind-rank/[sessionId], distinct from the history list at
 * /play/blind-rank. */
export function BlindRankRound({ session: initialSession, roundNumber }: { session: GameSessionRow; roundNumber: number }) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [order, setOrder] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [startingNext, setStartingNext] = useState(false);

  const prompt = session.prompt as unknown as BlindRankPrompt;
  const answeredByMe = session.game_answers.some((a) => a.user_id === userId);
  const result = session.game_results?.result as Result | undefined;

  useEffect(() => {
    prefetchMusicPool("album", BLIND_RANK_ROUND_SIZE, space.id);
  }, [space.id]);

  function tapItem(item: string) {
    setOrder((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
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
      await submitGameAnswer({
        sessionId: session.id,
        userId,
        answer: { ranking },
        spaceId: space.id,
        otherMemberId: otherMember?.id ?? null,
        gameType: "blind_rank",
        topic: session.topic,
      });
      const fresh = await getGameSession(session.id);
      setSession(fresh as unknown as GameSessionRow);
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't submit your ranking."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function nextRound() {
    setStartingNext(true);
    try {
      const { prompt: next, topic } = await pickBlindRankPrompt(space.id);
      const created = await createGameSession({
        spaceId: space.id,
        createdBy: userId,
        otherMemberId: otherMember?.id ?? null,
        gameType: "blind_rank",
        topic,
        category: next.category,
        prompt: next,
      });
      router.push(`/play/blind-rank/${created.id}`);
    } catch (err) {
      show(getErrorMessage(err, "Couldn't start the next round."), "error");
      setStartingNext(false);
    }
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
        roundNumber={roundNumber}
        question={session.topic}
      />

      {result ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-[#e6f2e9] px-4 py-3 text-center">
            <p className="text-[15px] font-semibold text-[#2f8f52]">
              {result.matches} of {prompt.items.length} ranked the same
            </p>
          </div>
          <div className="space-y-1.5">
            {prompt.items.map((item) => {
              const mine = (result[userId] as Record<string, number>)[item];
              const theirs = otherMember ? (result[otherMember.id] as Record<string, number>)[item] : undefined;
              const same = mine === theirs;
              const image = prompt.images?.[item];
              return (
                <div key={item} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${same ? "bg-[#e6f2e9]" : "bg-[#f7f5f1]"}`}>
                  {image !== undefined && <ItemThumb imageUrl={image} />}
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[#3a362f]">{item}</span>
                  <span className="shrink-0 text-[12px] text-[#7c766c]">
                    You #{mine}
                    {otherMember && ` · ${otherMember.display_name} #${theirs}`}
                  </span>
                </div>
              );
            })}
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
          <p className="text-[15px] font-semibold text-[#3a362f]">Ranking locked in</p>
          <p className="mt-1 text-[13px] text-[#a39d92]">
            Waiting on {otherMember?.display_name ?? "your partner"} to rank blind too.
          </p>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-[12.5px] text-[#a39d92]">Tap in order, favorite first. Tap again to undo.</p>
          <div className="space-y-2">
            {prompt.items.map((item) => {
              const rank = order.indexOf(item);
              const image = prompt.images?.[item];
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => tapItem(item)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left transition ${
                    rank >= 0 ? "bg-[#3a362f]" : "bg-[#f7f5f1]"
                  }`}
                >
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
        </div>
      )}

      {game.tagline && game.taglineIcon && <RoundTagline text={game.tagline} icon={game.taglineIcon} />}
    </div>
  );
}

function ItemThumb({ imageUrl }: { imageUrl: string | null }) {
  if (!imageUrl) {
    return <div className="h-11 w-11 shrink-0 rounded-xl bg-black/10" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
  );
}
