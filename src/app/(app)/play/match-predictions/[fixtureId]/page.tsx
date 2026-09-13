import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/session";
import { getMatchFixture } from "@/services/games-server";
import { MatchPredictionRound } from "@/components/play/MatchPredictionRound";

// The actual gameplay screen for one fixture -- distinct from
// /play/history.

export default async function MatchPredictionRoundPage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const fixture = await getMatchFixture(fixtureId);
  if (!fixture || fixture.space_id !== ctx.space.id) notFound();

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <MatchPredictionRound fixture={fixture} />
    </div>
  );
}
