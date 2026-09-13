import { getSessionContext } from "@/services/session";
import { getGameSessions } from "@/services/games-server";
import { KeepDropHistory } from "@/components/play/KeepDropHistory";

// History/inbox only -- past rounds + a CTA. The CTA creates a session
// and navigates to /play/keep3-drop2/[sessionId], the actual gameplay
// route (KeepDropRound).

export default async function Keep3Drop2Page() {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const sessions = await getGameSessions(ctx.space.id, "keep3_drop2");

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <KeepDropHistory sessions={sessions} />
    </div>
  );
}
