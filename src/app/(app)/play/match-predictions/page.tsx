import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/session";
import { getResumableFixture } from "@/services/games-server";
import { MatchPredictionCreateForm } from "@/components/play/MatchPredictionCreateForm";

// Base route is now a launcher: the next fixture needing a prediction
// (or, failing that, the most recent one to check in on) opens
// directly. Only a space with zero fixtures ever sees the create form
// -- there's no sports provider to generate one automatically.

export default async function MatchPredictionsPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const resumable = await getResumableFixture(ctx.space.id, ctx.userId);
  if (resumable) redirect(`/play/match-predictions/${resumable.id}`);

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <MatchPredictionCreateForm />
    </div>
  );
}
