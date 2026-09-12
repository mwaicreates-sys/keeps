"use client";

import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/types";

type NotifyInput = {
  spaceId: string;
  userId: string; // recipient
  type:
    | "new_drop"
    | "reaction"
    | "reply"
    | "story_activity"
    | "game_invite"
    | "game_answer"
    | "game_ready"
    | "prediction_settled"
    | "memory_resurfaced"
    | "saved_memory";
  category: "social" | "play" | "memories";
  title: string;
  body?: string;
  data?: Record<string, unknown>;
};

/** Notify the other member of the space about something that happened. */
export async function notify(input: NotifyInput) {
  const supabase = createClient();
  await supabase.from("notifications").insert({
    space_id: input.spaceId,
    user_id: input.userId,
    type: input.type,
    category: input.category,
    title: input.title,
    body: input.body,
    data: (input.data ?? {}) as Json,
  });
}
