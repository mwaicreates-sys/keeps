import { getSessionContext } from "@/services/session";
import { getGameSessions } from "@/services/games-server";
import { BlindRankGame } from "@/components/play/BlindRankGame";

export default async function BlindRankPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const sessions = await getGameSessions(ctx.space.id, "blind_rank");

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <BlindRankGame sessions={sessions} />
    </div>
  );
}
