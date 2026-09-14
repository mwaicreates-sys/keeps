import { getSessionContext } from "@/services/session";
import { buildRunStartPayload } from "@/services/game-runs-server";
import { BlindRankRunScreen } from "@/components/play/BlindRankRunScreen";
import { GameEntryError } from "@/components/play/GameEntryError";
import { playGame } from "@/lib/play-config";

// Today's Blind Rank run (one ranking of 5 items) lives directly at
// this base route now -- see this-or-that/page.tsx for the same model.

export default async function BlindRankPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  let initial;
  try {
    initial = await buildRunStartPayload(ctx.space.id, "blind_rank", ctx.userId);
  } catch (err) {
    console.error("[play/blind-rank] failed to load today's run", err);
    const game = playGame("blind-rank");
    return <GameEntryError icon={game.icon} bg={game.bg} iconColor={game.iconColor} label={game.label} retryHref="/play/blind-rank" />;
  }

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <BlindRankRunScreen initial={initial} />
    </div>
  );
}
