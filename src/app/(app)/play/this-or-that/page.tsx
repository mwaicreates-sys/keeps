import { getSessionContext } from "@/services/session";
import { buildRunStartPayload } from "@/services/game-runs-server";
import { ChoiceRunScreen } from "@/components/play/ChoiceRunScreen";
import { GameEntryError } from "@/components/play/GameEntryError";
import { playGame } from "@/lib/play-config";

// Base route is the whole game now: today's run (5 questions, answered
// continuously, no waiting between them) lives here directly -- no
// session ids, no history-list detour. Past completed days live at
// /play/history.

export default async function ThisOrThatPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  // A card must never lead to a dead end: if today's run can't even be
  // fetched/generated (a transient provider or database error, not the
  // "no visual content" case buildRunStartPayload itself already
  // handles by returning a null run), this route still renders a real,
  // actionable screen instead of an unhandled crash.
  let initial;
  try {
    initial = await buildRunStartPayload(ctx.space.id, "this_or_that", ctx.userId);
  } catch (err) {
    console.error("[play/this-or-that] failed to load today's run", err);
    const game = playGame("this-or-that");
    return <GameEntryError icon={game.icon} bg={game.bg} iconColor={game.iconColor} label={game.label} retryHref="/play/this-or-that" />;
  }

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <ChoiceRunScreen gameType="this_or_that" slug="this-or-that" initial={initial} />
    </div>
  );
}
