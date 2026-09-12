"use client";

import { createClient } from "@/lib/supabase/client";

/** Persists a Top 5 as historical, exportable content beyond the game_answers blob. */
export async function saveTop5List(input: {
  spaceId: string;
  sessionId?: string;
  userId: string;
  topic: string;
  items: string[];
}) {
  const supabase = createClient();
  const { data: list, error } = await supabase
    .from("top5_lists")
    .insert({
      space_id: input.spaceId,
      session_id: input.sessionId || null,
      user_id: input.userId,
      topic: input.topic,
    })
    .select()
    .single();
  if (error) throw error;

  const rows = input.items.slice(0, 5).map((item_name, i) => ({
    list_id: list.id,
    rank: i + 1,
    item_name,
  }));
  await supabase.from("top5_items").insert(rows);
  return list;
}
