import { getSessionContext } from "@/services/session";
import { buildRunStartPayload } from "@/services/game-runs-server";
import { ChoiceRunScreen } from "@/components/play/ChoiceRunScreen";

// Same daily-run model as this-or-that/page.tsx.

export default async function GuessMinePage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const initial = await buildRunStartPayload(ctx.space.id, "guess_mine", ctx.userId);

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <ChoiceRunScreen gameType="guess_mine" slug="guess-mine" initial={initial} />
    </div>
  );
}
