import { getSessionContext } from "@/services/session";
import { buildRunStartPayload } from "@/services/game-runs-server";
import { KeepDropRunScreen } from "@/components/play/KeepDropRunScreen";
import { GameEntryError } from "@/components/play/GameEntryError";
import { playGame } from "@/lib/play-config";

// Today's Keep 3, Drop 2 run (one keep-3-of-5 pick) lives directly at
// this base route now -- see this-or-that/page.tsx for the same model.

export default async function Keep3Drop2Page() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  let initial;
  try {
    initial = await buildRunStartPayload(ctx.space.id, "keep3_drop2", ctx.userId);
  } catch (err) {
    console.error("[play/keep3-drop2] failed to load today's run", err);
    const game = playGame("keep3-drop2");
    return <GameEntryError icon={game.icon} bg={game.bg} iconColor={game.iconColor} label={game.label} retryHref="/play/keep3-drop2" />;
  }

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <KeepDropRunScreen initial={initial} />
    </div>
  );
}
