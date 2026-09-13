import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/session";
import { getResumableSession } from "@/services/games-server";
import { Top5Launcher } from "@/components/play/Top5Launcher";

// Base route is now a launcher, not a history list. Past rounds live
// at /play/history.

export default async function Top5Page() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const resumable = await getResumableSession(ctx.space.id, "top5", ctx.userId);
  if (resumable) redirect(`/play/top5/${resumable.id}`);

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <Top5Launcher />
    </div>
  );
}
