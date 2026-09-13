import { getSessionContext } from "@/services/session";
import { buildRunStartPayload } from "@/services/game-runs-server";
import { ChoiceRunScreen } from "@/components/play/ChoiceRunScreen";

// Base route is the whole game now: today's run (5 questions, answered
// continuously, no waiting between them) lives here directly -- no
// session ids, no history-list detour. Past completed days live at
// /play/history.

export default async function ThisOrThatPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const initial = await buildRunStartPayload(ctx.space.id, "this_or_that", ctx.userId);

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <ChoiceRunScreen gameType="this_or_that" slug="this-or-that" initial={initial} />
    </div>
  );
}
