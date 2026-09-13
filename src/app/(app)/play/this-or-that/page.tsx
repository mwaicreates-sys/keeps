import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/session";
import { getResumableSession, getDailyPlayCount } from "@/services/games-server";
import { DAILY_PLAY_CAP } from "@/lib/game-types";
import { ChoiceGameLauncher } from "@/components/play/ChoiceGameLauncher";
import { DailyCapReached } from "@/components/play/DailyCapReached";
import { playGame } from "@/lib/play-config";

// Base route is now a launcher, not a history list: tapping "This or
// That" on the Play hub should start playing immediately. Past rounds
// live at /play/history instead.

export default async function ThisOrThatPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const resumable = await getResumableSession(ctx.space.id, "this_or_that", ctx.userId);
  if (resumable) redirect(`/play/this-or-that/${resumable.id}`);

  // Server-side daily-cap gate: shown before the launcher ever tries to
  // start a round, so a capped player never even sees "Starting..." --
  // /api/play/session enforces this same limit regardless, this is
  // just the UI reflecting it up front.
  const dailyCount = await getDailyPlayCount(ctx.space.id, "this_or_that", ctx.userId);
  if (dailyCount >= DAILY_PLAY_CAP) {
    const game = playGame("this-or-that");
    return <DailyCapReached label={game.label} icon={game.icon} bg={game.bg} iconColor={game.iconColor} />;
  }

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <ChoiceGameLauncher gameType="this_or_that" slug="this-or-that" />
    </div>
  );
}
