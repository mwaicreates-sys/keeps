import { getSessionContext } from "@/services/session";
import { getGameSessions } from "@/services/games-server";
import { ChoiceGame } from "@/components/play/ChoiceGame";

export default async function ThisOrThatPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const sessions = await getGameSessions(ctx.space.id, "this_or_that");

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <ChoiceGame
        gameType="this_or_that"
        title="This or That"
        subtitle="Pick a side, see if you match."
        ctaLabel="New This or That"
        sessions={sessions}
      />
    </div>
  );
}
