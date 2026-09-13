import { getSessionContext } from "@/services/session";
import { getGameSessions } from "@/services/games-server";
import { KeepDropGame } from "@/components/play/KeepDropGame";

export default async function Keep3Drop2Page() {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const sessions = await getGameSessions(ctx.space.id, "keep3_drop2");

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <KeepDropGame sessions={sessions} />
    </div>
  );
}
