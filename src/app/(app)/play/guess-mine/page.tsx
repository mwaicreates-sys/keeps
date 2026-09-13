import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/session";
import { getResumableSession, getDailyPlayCount } from "@/services/games-server";
import { DAILY_PLAY_CAP } from "@/lib/game-types";
import { ChoiceGameLauncher } from "@/components/play/ChoiceGameLauncher";
import { DailyCapReached } from "@/components/play/DailyCapReached";
import { playGame } from "@/lib/play-config";

// Base route is now a launcher, not a history list -- see
// this-or-that/page.tsx for the same pattern. Past rounds live at
// /play/history.

export default async function GuessMinePage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const resumable = await getResumableSession(ctx.space.id, "guess_mine", ctx.userId);
  if (resumable) redirect(`/play/guess-mine/${resumable.id}`);

  const dailyCount = await getDailyPlayCount(ctx.space.id, "guess_mine", ctx.userId);
  if (dailyCount >= DAILY_PLAY_CAP) {
    const game = playGame("guess-mine");
    return <DailyCapReached label={game.label} icon={game.icon} bg={game.bg} iconColor={game.iconColor} />;
  }

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <ChoiceGameLauncher gameType="guess_mine" slug="guess-mine" />
    </div>
  );
}
