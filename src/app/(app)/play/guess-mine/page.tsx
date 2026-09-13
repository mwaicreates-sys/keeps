import { getSessionContext } from "@/services/session";
import { getGameSessions } from "@/services/games-server";
import { ChoiceGameHistory } from "@/components/play/ChoiceGameHistory";

// History/inbox only -- past rounds + a CTA. The CTA creates a session
// and navigates to /play/guess-mine/[sessionId], the actual gameplay
// route (ChoiceGameRound).

export default async function GuessMinePage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const sessions = await getGameSessions(ctx.space.id, "guess_mine");

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <ChoiceGameHistory
        gameType="guess_mine"
        slug="guess-mine"
        title="Guess Mine"
        subtitle="Guess what they'd pick."
        ctaLabel="New Guess Mine"
        sessions={sessions}
      />
    </div>
  );
}
