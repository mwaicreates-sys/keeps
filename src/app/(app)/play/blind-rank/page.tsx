import { getSessionContext } from "@/services/session";
import { buildRunStartPayload } from "@/services/game-runs-server";
import { BlindRankRunScreen } from "@/components/play/BlindRankRunScreen";

// Today's Blind Rank run (one ranking of 5 items) lives directly at
// this base route now -- see this-or-that/page.tsx for the same model.

export default async function BlindRankPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const initial = await buildRunStartPayload(ctx.space.id, "blind_rank", ctx.userId);

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <BlindRankRunScreen initial={initial} />
    </div>
  );
}
