import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types";

export type Resurfaced = { label: string; post: Tables<"posts"> & { author: Tables<"profiles"> } };

/**
 * Only ever resurfaces real, previously-stored posts — never fabricated
 * content. "On this day" windows check the *day of year*, others check an
 * elapsed-time threshold.
 */
export async function getResurfaced(spaceId: string): Promise<Resurfaced[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("*, author:profiles!posts_author_id_fkey(*)")
    .eq("space_id", spaceId)
    .eq("saved_to_memories", true)
    .order("occurred_at", { ascending: true });

  const posts = (data ?? []) as (Tables<"posts"> & { author: Tables<"profiles"> })[];
  if (posts.length === 0) return [];

  const now = new Date();
  const results: Resurfaced[] = [];

  const onThisDay = posts.find((p) => {
    const d = new Date(p.occurred_at);
    return d.getMonth() === now.getMonth() && d.getDate() === now.getDate() && d.getFullYear() !== now.getFullYear();
  });
  if (onThisDay) {
    const years = now.getFullYear() - new Date(onThisDay.occurred_at).getFullYear();
    results.push({ label: `${years} year${years > 1 ? "s" : ""} ago today`, post: onThisDay });
  }

  const daysAgo = (p: Tables<"posts">) =>
    Math.floor((now.getTime() - new Date(p.occurred_at).getTime()) / 86_400_000);

  for (const [label, target] of [
    ["30 days ago", 30],
    ["90 days ago", 90],
  ] as const) {
    const match = posts.find((p) => Math.abs(daysAgo(p) - target) <= 1);
    if (match) results.push({ label, post: match });
  }

  if (posts[0]) results.push({ label: "Your first Drop", post: posts[0] });
  const firstSong = posts.find((p) => p.type === "song");
  if (firstSong && firstSong !== posts[0]) results.push({ label: "Your first shared song", post: firstSong });

  return results.slice(0, 4);
}
