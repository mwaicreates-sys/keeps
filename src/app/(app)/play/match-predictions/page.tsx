import { getSessionContext } from "@/services/session";
import { getMatchFixtures } from "@/services/games-server";
import { MatchPredictionsGame } from "@/components/play/MatchPredictionsGame";

export default async function MatchPredictionsPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const fixtures = await getMatchFixtures(ctx.space.id);

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <MatchPredictionsGame fixtures={fixtures} />
    </div>
  );
}
