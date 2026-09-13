import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/session";
import { getResumableSession } from "@/services/games-server";
import { ChoiceGameLauncher } from "@/components/play/ChoiceGameLauncher";

// Base route is now a launcher, not a history list -- see
// this-or-that/page.tsx for the same pattern. Past rounds live at
// /play/history.

export default async function GuessMinePage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const resumable = await getResumableSession(ctx.space.id, "guess_mine", ctx.userId);
  if (resumable) redirect(`/play/guess-mine/${resumable.id}`);

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <ChoiceGameLauncher gameType="guess_mine" slug="guess-mine" />
    </div>
  );
}
