import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/session";
import { getGameSession, getDailyPlayCount } from "@/services/games-server";
import { KeepDropRound } from "@/components/play/KeepDropRound";

// The actual immersive gameplay screen -- distinct from the history
// list at /play/keep3-drop2.

export default async function KeepDropRoundPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const session = await getGameSession(sessionId);
  if (!session || session.space_id !== ctx.space.id || session.game_type !== "keep3_drop2") notFound();
  const roundNumber = await getDailyPlayCount(ctx.space.id, "keep3_drop2", session.created_by, session.created_at);

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <KeepDropRound session={session} roundNumber={roundNumber} />
    </div>
  );
}
