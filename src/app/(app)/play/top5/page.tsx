import { getSessionContext } from "@/services/session";
import { buildRunStartPayload } from "@/services/game-runs-server";
import { Top5RunScreen } from "@/components/play/Top5RunScreen";

// Today's Top 5 run (one list submission) lives directly at this base
// route now -- see this-or-that/page.tsx for the same model.

export default async function Top5Page() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const initial = await buildRunStartPayload(ctx.space.id, "top5", ctx.userId);

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <Top5RunScreen initial={initial} />
    </div>
  );
}
