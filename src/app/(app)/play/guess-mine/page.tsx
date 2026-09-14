import { getSessionContext } from "@/services/session";
import { buildRunStartPayload } from "@/services/game-runs-server";
import { ChoiceRunScreen } from "@/components/play/ChoiceRunScreen";
import { GameEntryError } from "@/components/play/GameEntryError";
import { playGame } from "@/lib/play-config";

// Same daily-run model as this-or-that/page.tsx.

export default async function GuessMinePage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  let initial;
  try {
    initial = await buildRunStartPayload(ctx.space.id, "guess_mine", ctx.userId);
  } catch (err) {
    console.error("[play/guess-mine] failed to load today's run", err);
    const game = playGame("guess-mine");
    return <GameEntryError icon={game.icon} bg={game.bg} iconColor={game.iconColor} label={game.label} retryHref="/play/guess-mine" />;
  }

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <ChoiceRunScreen gameType="guess_mine" slug="guess-mine" initial={initial} />
    </div>
  );
}
