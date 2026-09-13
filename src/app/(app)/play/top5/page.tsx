import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/session";
import { getResumableSession, getDailyPlayCount } from "@/services/games-server";
import { DAILY_PLAY_CAP } from "@/lib/game-types";
import { Top5Launcher } from "@/components/play/Top5Launcher";
import { DailyCapReached } from "@/components/play/DailyCapReached";
import { playGame } from "@/lib/play-config";

// Base route is now a launcher, not a history list. Past rounds live
// at /play/history.

export default async function Top5Page() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const resumable = await getResumableSession(ctx.space.id, "top5", ctx.userId);
  if (resumable) redirect(`/play/top5/${resumable.id}`);

  const dailyCount = await getDailyPlayCount(ctx.space.id, "top5", ctx.userId);
  if (dailyCount >= DAILY_PLAY_CAP) {
    const game = playGame("top5");
    return <DailyCapReached label={game.label} icon={game.icon} bg={game.bg} iconColor={game.iconColor} />;
  }

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <Top5Launcher />
    </div>
  );
}
