import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/session";
import { getResumableSession } from "@/services/games-server";
import { ChoiceGameLauncher } from "@/components/play/ChoiceGameLauncher";

// Base route is now a launcher, not a history list: tapping "This or
// That" on the Play hub should start playing immediately. Past rounds
// live at /play/history instead.

export default async function ThisOrThatPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const resumable = await getResumableSession(ctx.space.id, "this_or_that", ctx.userId);
  if (resumable) redirect(`/play/this-or-that/${resumable.id}`);

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <ChoiceGameLauncher gameType="this_or_that" slug="this-or-that" />
    </div>
  );
}
