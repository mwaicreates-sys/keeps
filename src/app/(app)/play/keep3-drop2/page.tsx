import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/session";
import { getResumableSession } from "@/services/games-server";
import { KeepDropLauncher } from "@/components/play/KeepDropLauncher";

// Base route is now a launcher, not a history list. Past rounds live
// at /play/history.

export default async function Keep3Drop2Page() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const resumable = await getResumableSession(ctx.space.id, "keep3_drop2", ctx.userId);
  if (resumable) redirect(`/play/keep3-drop2/${resumable.id}`);

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <KeepDropLauncher />
    </div>
  );
}
