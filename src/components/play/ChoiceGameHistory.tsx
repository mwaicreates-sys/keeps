"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createGameSession } from "@/services/games-client";
import { prefetchMusicPool } from "@/services/music-pool-client";
import { pickChoicePrompt } from "@/lib/choice-prompt";
import { getErrorMessage, timeAgo } from "@/lib/utils";
import { GameHeader } from "@/components/play/GameHeader";
import { EmptyState } from "@/components/EmptyState";
import { sessionStatus, type GameSessionRow } from "@/lib/game-types";

/**
 * The history/inbox view for This or That and Guess Mine -- past rounds,
 * their status, and a CTA to start a new one. This is NOT the game: it
 * never renders a prompt or a choice, only a list. Tapping the CTA
 * creates a fresh round (real, image-first content whenever the
 * provider has it) and navigates straight to the immersive gameplay
 * route at /play/<slug>/<sessionId> -- the round itself lives there.
 */
export function ChoiceGameHistory({
  gameType,
  slug,
  title,
  subtitle,
  ctaLabel,
  sessions,
}: {
  gameType: "this_or_that" | "guess_mine";
  slug: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  sessions: GameSessionRow[];
}) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  // Warm the pool as soon as this page opens, so even the first tap of
  // the CTA doesn't wait on a cold provider request.
  useEffect(() => {
    prefetchMusicPool("artist", 2, space.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startNew() {
    setStarting(true);
    try {
      const prompt = await pickChoicePrompt(gameType, space.id);
      const session = await createGameSession({
        spaceId: space.id,
        createdBy: userId,
        otherMemberId: otherMember?.id ?? null,
        gameType,
        topic: prompt.topic,
        category: prompt.category,
        prompt,
      });
      router.push(`/play/${slug}/${session.id}`);
    } catch (err) {
      show(getErrorMessage(err, "Couldn't start a new round."), "error");
      setStarting(false);
    }
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
              <SessionRow key={s.id} session={s} onOpen={() => router.push(`/play/${slug}/${s.id}`)} />
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
