import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/session";
import { getResumableSession } from "@/services/games-server";
import { BlindRankLauncher } from "@/components/play/BlindRankLauncher";

// Base route is now a launcher, not a history list. Past rounds live
// at /play/history.

export default async function BlindRankPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const resumable = await getResumableSession(ctx.space.id, "blind_rank", ctx.userId);
  if (resumable) redirect(`/play/blind-rank/${resumable.id}`);

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <BlindRankLauncher />
    </div>
  );
}
