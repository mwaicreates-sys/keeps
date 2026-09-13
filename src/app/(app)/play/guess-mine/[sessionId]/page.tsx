import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/session";
import { getGameSession } from "@/services/games-server";
import { ChoiceGameRound } from "@/components/play/ChoiceGameRound";

// The actual immersive gameplay screen -- distinct from the history
// list at /play/guess-mine. Reached only by starting a round there (or
// a notification linking to a specific round).

export default async function GuessMineRoundPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const session = await getGameSession(sessionId);
  if (!session || session.space_id !== ctx.space.id || session.game_type !== "guess_mine") notFound();

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <ChoiceGameRound gameType="guess_mine" slug="guess-mine" session={session} />
    </div>
  );
}
