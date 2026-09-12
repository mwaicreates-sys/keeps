import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";

export default async function UsPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const supabase = await createClient();

  const [{ count: memories }, { count: songs }, { data: firstPost }, { data: firstSong }, { count: games }, { data: results }] =
    await Promise.all([
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("space_id", ctx.space.id).eq("saved_to_memories", true),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("space_id", ctx.space.id).eq("type", "song"),
      supabase.from("posts").select("*").eq("space_id", ctx.space.id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
      supabase.from("posts").select("*").eq("space_id", ctx.space.id).eq("type", "song").order("created_at", { ascending: true }).limit(1).maybeSingle(),
      supabase.from("game_sessions").select("id", { count: "exact", head: true }).eq("space_id", ctx.space.id).eq("status", "completed"),
      supabase.from("game_results").select("result, game_sessions!inner(space_id, game_type)").eq("game_sessions.space_id", ctx.space.id),
    ]);

  const top5Results = (results ?? []).filter((r) => (r.game_sessions as unknown as { game_type: string }).game_type === "top5");
  const closestTop5 = top5Results
    .map((r) => r.result as { overlapPct?: number })
    .filter((r) => typeof r.overlapPct === "number")
    .sort((a, b) => (b.overlapPct ?? 0) - (a.overlapPct ?? 0))[0];

  const matchedCount = (results ?? []).filter((r) => (r.result as { matched?: boolean }).matched).length;
  const totalCompared = (results ?? []).filter((r) => "matched" in (r.result as object)).length;
  const tasteMatch = totalCompared > 0 ? Math.round((matchedCount / totalCompared) * 100) : null;

  const names = ctx.members.map((m) => m.display_name).join(" × ");

  const stats: { label: string; value: string }[] = [
    { label: "Memories kept", value: String(memories ?? 0) },
    { label: "Songs shared", value: String(songs ?? 0) },
    { label: "Games played", value: String(games ?? 0) },
  ];
  if (tasteMatch != null) stats.push({ label: "Taste match", value: `${tasteMatch}%` });
  if (closestTop5?.overlapPct != null) stats.push({ label: "Closest Top 5", value: `${closestTop5.overlapPct}%` });

  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center">
      <p className="font-display text-3xl italic">{names || "Us"}</p>
      <p className="mt-1 text-sm text-ink-soft">Your shared history so far.</p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-3xl border border-line bg-paper-raised p-5">
            <p className="font-display text-2xl">{s.value}</p>
            <p className="text-xs text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-3 text-left">
        {firstPost && (
          <div className="rounded-2xl border border-line px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gold">First Drop</p>
            <p className="text-sm">{firstPost.caption || `A ${firstPost.type}`}</p>
          </div>
        )}
        {firstSong && (
          <div className="rounded-2xl border border-line px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gold">First shared song</p>
            <p className="text-sm">{firstSong.caption || "A song you both kept"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
