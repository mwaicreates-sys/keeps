import { getSessionContext } from "@/services/session";
import { getGameSessions } from "@/services/games-server";
import { Top5Game } from "@/components/play/Top5Game";

export default async function Top5Page() {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const sessions = await getGameSessions(ctx.space.id, "top5");

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <Top5Game sessions={sessions} />
    </div>
  );
}
