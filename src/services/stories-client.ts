"use client";

import { createClient } from "@/lib/supabase/client";
import { uploadMedia } from "@/services/posts-client";
import { notify } from "@/services/notify-client";

export type CreateStoryInput = {
  spaceId: string;
  authorId: string;
  otherMemberId: string | null;
  type: "photo" | "video" | "text" | "song";
  file?: File;
  textContent?: string;
  song?: { title: string; artist?: string; artworkUrl?: string; url?: string };
};

export async function createStory(input: CreateStoryInput) {
  const supabase = createClient();
  let mediaUrl: string | null = null;
  if (input.file) {
    const uploaded = await uploadMedia(input.spaceId, input.file);
    mediaUrl = uploaded.url;
  }

  const { data, error } = await supabase
    .from("stories")
    .insert({
      space_id: input.spaceId,
      author_id: input.authorId,
      type: input.type,
      media_url: mediaUrl,
      text_content: input.textContent || null,
      song_title: input.song?.title || null,
      song_artist: input.song?.artist || null,
      song_artwork_url: input.song?.artworkUrl || null,
      song_url: input.song?.url || null,
    })
    .select()
    .single();
  if (error) throw error;

  if (input.otherMemberId) {
    await notify({
      spaceId: input.spaceId,
      userId: input.otherMemberId,
      type: "story_activity",
      category: "social",
      title: "New story",
      data: { storyId: data.id },
    });
  }

  return data;
}

export async function markStoryViewed(storyId: string, userId: string) {
  const supabase = createClient();
  await supabase.from("story_views").upsert({ story_id: storyId, user_id: userId });
}

export async function saveStoryToMemories(storyId: string, spaceId: string, authorId: string) {
  const supabase = createClient();
  const { data: story } = await supabase.from("stories").select("*").eq("id", storyId).single();
  if (!story) return;

  await supabase.from("stories").update({ saved_to_memories: true }).eq("id", storyId);

  // Stories don't live forever — saving promotes it into a real Memory (a post).
  const type = story.type === "song" ? "song" : story.type === "text" ? "text" : story.type;
  const { data: post } = await supabase
    .from("posts")
    .insert({
      space_id: spaceId,
      author_id: authorId,
      type,
      caption: story.text_content,
      saved_to_memories: true,
      occurred_at: story.created_at,
    })
    .select()
    .single();

  if (post) {
    if (story.media_url) {
      await supabase.from("post_media").insert({
        post_id: post.id,
        url: story.media_url,
        media_type: story.type === "video" ? "video" : "photo",
        order_index: 0,
      });
    }
    if (story.type === "song") {
      await supabase.from("post_song_metadata").insert({
        post_id: post.id,
        title: story.song_title || "Untitled",
        artist: story.song_artist,
        artwork_url: story.song_artwork_url,
        url: story.song_url,
      });
    }
  }
}
