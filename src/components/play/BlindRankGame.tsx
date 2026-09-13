"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X as XIcon, EyeOff, RotateCcw } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createGameSession, submitGameAnswer } from "@/services/games-client";
import { getGameSession } from "@/services/games-read-client";
import { fetchMusicPool } from "@/services/music-pool-client";
import { MUSIC_CATEGORY } from "@/lib/play-music-categories";
import { BLIND_RANK_PACK, randomFrom } from "@/lib/game-prompts";
import { getErrorMessage, timeAgo } from "@/lib/utils";
import { GameHeader } from "@/components/play/GameHeader";
import { EmptyState } from "@/components/EmptyState";
import { sessionStatus, type GameSessionRow } from "@/lib/game-types";

type Prompt = {
  items: string[];
  category: string;
  /** Only present for a real, provider-backed set (e.g. 5 albums) --
   * looked up by item title so the existing string-keyed ranking/result
   * logic below never has to change shape. */
  images?: Record<string, string | null>;
};
type Result = { matches: number; [userId: string]: unknown };

const ROUND_SIZE = 5;

export function BlindRankGame({ sessions }: { sessions: GameSessionRow[] }) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const [active, setActive] = useState<GameSessionRow | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);

  async function startNew() {
    setStarting(true);
    try {
      let prompt: Prompt;
      let topic: string;

      const useMusic = Math.random() < 0.5;
      const pool = useMusic ? await fetchMusicPool("album", ROUND_SIZE, space.id) : null;

      if (pool && pool.items.length === ROUND_SIZE) {
        const items = pool.items.map((i) => i.title);
        prompt = {
          items,
          category: MUSIC_CATEGORY.album,
          images: Object.fromEntries(pool.items.map((i) => [i.title, i.imageUrl])),
        };
        topic = "Rank these albums";
      } else {
        const p = randomFrom(BLIND_RANK_PACK);
        prompt = { items: p.items, category: p.category };
        topic = p.topic;
      }

      const session = await createGameSession({
        spaceId: space.id,
        createdBy: userId,
        otherMemberId: otherMember?.id ?? null,
        gameType: "blind_rank",
        topic,
        category: prompt.category,
        prompt,
      });
      setActive({ ...session, game_answers: [], game_results: null } as GameSessionRow);
      setOrder([]);
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't start a new round."), "error");
    } finally {
      setStarting(false);
    }
  }

  function tapItem(item: string) {
    setOrder((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  }

  async function submit() {
    if (!active) return;
    const prompt = active.prompt as unknown as Prompt;
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
        sessionId: active.id,
        userId,
        answer: { ranking },
        spaceId: space.id,
        otherMemberId: otherMember?.id ?? null,
        gameType: "blind_rank",
        topic: active.topic,
      });
      const fresh = await getGameSession(active.id);
      setActive(fresh as unknown as GameSessionRow);
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't submit your ranking."), "error");
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
                  <div
                    key={item}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${same ? "bg-[#e6f2e9]" : "bg-[#f7f5f1]"}`}
                  >
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
            <p className="mb-3 text-[13px] text-[#a39d92]">Tap in order, favorite first. Tap again to undo.</p>
            <div className="space-y-2">
              {prompt.items.map((item) => {
                const rank = order.indexOf(item);
                const image = prompt.images?.[item];
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => tapItem(item)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-[14.5px] font-medium transition ${
                      rank >= 0 ? "bg-[#3a362f] text-white" : "bg-[#f7f5f1] text-[#3a362f]"
                    }`}
                  >
                    {image !== undefined && <ItemThumb imageUrl={image} />}
                    <span className="min-w-0 flex-1 truncate">{item}</span>
                    {rank >= 0 && (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/20 text-[12px] font-bold">
                        {rank + 1}
                      </span>
                    )}
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
      </div>
    );
  }

  return (
    <div>
      <GameHeader title="Blind Rank" subtitle="Rank in secret, reveal together." />
      <div className="px-4 pb-5">
        <button
          type="button"
          onClick={startNew}
          disabled={starting}
          className="w-full rounded-2xl bg-[#3a362f] py-4 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {starting ? "Starting…" : "New Blind Rank"}
        </button>
      </div>
      <div className="px-4">
        {sessions.length === 0 ? (
          <EmptyState icon={EyeOff} title="No rounds yet" body="Start one above and see how closely you rank things." />
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

function ItemThumb({ imageUrl }: { imageUrl: string | null }) {
  if (!imageUrl) {
    return <div className="h-9 w-9 shrink-0 rounded-lg bg-black/10" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
  );
}

function SessionRow({ session, onOpen }: { session: GameSessionRow; onOpen: () => void }) {
  const { userId } = useSession();
  const status = sessionStatus(session, userId);
  const result = session.game_results?.result as { matches?: number } | undefined;
  const prompt = session.prompt as unknown as Prompt;
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
          <span className="shrink-0 rounded-full bg-[#e6f2e9] px-2.5 py-1 text-[11px] font-semibold text-[#2f8f52]">
            {result?.matches ?? 0}/{prompt.items.length} matched
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
