import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/session";
import { getGameSession, getGameSessionRoundNumber } from "@/services/games-server";
import { Top5Round } from "@/components/play/Top5Round";

// The actual immersive gameplay screen -- distinct from the history
// list at /play/history.

export default async function Top5RoundPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const session = await getGameSession(sessionId);
  if (!session || session.space_id !== ctx.space.id || session.game_type !== "top5") notFound();
  const roundNumber = await getGameSessionRoundNumber(ctx.space.id, "top5", session.created_at);

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <Top5Round session={session} roundNumber={roundNumber} />
    </div>
  );
}
