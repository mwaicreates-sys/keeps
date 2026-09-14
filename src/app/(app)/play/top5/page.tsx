import { getSessionContext } from "@/services/session";
import { buildRunStartPayload } from "@/services/game-runs-server";
import { Top5RunScreen } from "@/components/play/Top5RunScreen";
import { GameEntryError } from "@/components/play/GameEntryError";
import { playGame } from "@/lib/play-config";

// Today's Top 5 run (one list submission) lives directly at this base
// route now -- see this-or-that/page.tsx for the same model.

export default async function Top5Page() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  let initial;
  try {
    initial = await buildRunStartPayload(ctx.space.id, "top5", ctx.userId);
  } catch (err) {
    console.error("[play/top5] failed to load today's run", err);
    const game = playGame("top5");
    return <GameEntryError icon={game.icon} bg={game.bg} iconColor={game.iconColor} label={game.label} retryHref="/play/top5" />;
  }

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <Top5RunScreen initial={initial} />
    </div>
  );
}
