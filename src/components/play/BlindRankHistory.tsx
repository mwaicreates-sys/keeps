"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createGameSession } from "@/services/games-client";
import { prefetchMusicPool } from "@/services/music-pool-client";
import { pickBlindRankPrompt, BLIND_RANK_ROUND_SIZE } from "@/lib/blind-rank-prompt";
import { getErrorMessage, timeAgo } from "@/lib/utils";
import { GameHeader } from "@/components/play/GameHeader";
import { EmptyState } from "@/components/EmptyState";
import { sessionStatus, type GameSessionRow } from "@/lib/game-types";
import type { BlindRankPrompt } from "@/lib/blind-rank-prompt";

/** History/inbox view -- not the game itself. The CTA creates a round
 * and navigates to /play/blind-rank/[sessionId], the real gameplay
 * screen (BlindRankRound). */
export function BlindRankHistory({ sessions }: { sessions: GameSessionRow[] }) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    prefetchMusicPool("album", BLIND_RANK_ROUND_SIZE, space.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startNew() {
    setStarting(true);
    try {
      const { prompt, topic } = await pickBlindRankPrompt(space.id);
      const session = await createGameSession({
        spaceId: space.id,
        createdBy: userId,
        otherMemberId: otherMember?.id ?? null,
        gameType: "blind_rank",
        topic,
        category: prompt.category,
        prompt,
      });
      router.push(`/play/blind-rank/${session.id}`);
    } catch (err) {
      show(getErrorMessage(err, "Couldn't start a new round."), "error");
      setStarting(false);
    }
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
              <SessionRow key={s.id} session={s} onOpen={() => router.push(`/play/blind-rank/${s.id}`)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SessionRow({ session, onOpen }: { session: GameSessionRow; onOpen: () => void }) {
  const { userId } = useSession();
  const status = sessionStatus(session, userId);
  const result = session.game_results?.result as { matches?: number } | undefined;
  const prompt = session.prompt as unknown as BlindRankPrompt;
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
