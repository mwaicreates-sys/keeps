import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types";

export type StoryWithAuthor = Tables<"stories"> & { author: Tables<"profiles">; viewed: boolean };

export async function getActiveStories(spaceId: string, userId: string): Promise<StoryWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .select("*, author:profiles!stories_author_id_fkey(*), story_views(user_id)")
    .eq("space_id", spaceId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((s) => ({
    ...(s as unknown as Tables<"stories">),
    author: s.author as Tables<"profiles">,
    viewed: (s.story_views as { user_id: string }[]).some((v) => v.user_id === userId),
  }));
}
