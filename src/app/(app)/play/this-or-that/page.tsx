import { getSessionContext } from "@/services/session";
import { getGameSessions } from "@/services/games-server";
import { ChoiceGameHistory } from "@/components/play/ChoiceGameHistory";

// History/inbox only -- past rounds + a CTA. The CTA creates a session
// and navigates to /play/this-or-that/[sessionId], the actual gameplay
// route (ChoiceGameRound).

export default async function ThisOrThatPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const sessions = await getGameSessions(ctx.space.id, "this_or_that");

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <ChoiceGameHistory
        gameType="this_or_that"
        slug="this-or-that"
        title="This or That"
        subtitle="Pick a side, see if you match."
        ctaLabel="New This or That"
        sessions={sessions}
      />
    </div>
  );
}
