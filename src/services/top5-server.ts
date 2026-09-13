import { createClient } from "@/lib/supabase/server";

export type Top5ListSummary = { id: string; topic: string; createdAt: string; items: string[] };

/** This person's own saved Top 5 lists (top5-client.ts's saveTop5List
 * output), each with its 5 items in rank order. */
export async function getTop5Lists(spaceId: string, userId: string): Promise<Top5ListSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("top5_lists")
    .select("id, topic, created_at, top5_items(rank, item_name)")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((l) => ({
    id: l.id as string,
    topic: l.topic as string,
    createdAt: l.created_at as string,
    items: ((l.top5_items ?? []) as { rank: number; item_name: string }[])
      .sort((a, b) => a.rank - b.rank)
      .map((i) => i.item_name),
  }));
}
