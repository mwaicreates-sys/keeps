"use client";

import { createClient } from "@/lib/supabase/client";
import { notify } from "@/services/notify-client";

export type DropType =
  | "photo"
  | "video"
  | "text"
  | "song"
  | "activity"
  | "favorite"
  | "link"
  | "place"
  | "milestone"
  | "screenshot";

export type CreateDropInput = {
  spaceId: string;
  authorId: string;
  otherMemberId: string | null;
  type: DropType;
  caption?: string;
  place?: string;
  category?: string;
  occurredAt?: string;
  tags?: string[];
  mediaFiles?: File[];
  song?: { title: string; artist?: string; album?: string; artworkUrl?: string; url?: string; note?: string };
  favorite?: { favoriteType: string; itemName: string; note?: string };
};

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB per file — sensible upload limit
const ACCEPTED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_VIDEO = ["video/mp4", "video/quicktime", "video/webm"];

export async function uploadMedia(spaceId: string, file: File): Promise<{ url: string; type: "photo" | "video" }> {
  const isImage = ACCEPTED_IMAGE.includes(file.type);
  const isVideo = ACCEPTED_VIDEO.includes(file.type);
  if (!isImage && !isVideo) {
    throw new Error("Only JPEG/PNG/WebP/GIF images or MP4/MOV/WebM videos are supported.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File is too large. Max size is 25MB.");
  }

  const supabase = createClient();
  const ext = file.name.split(".").pop() || (isImage ? "jpg" : "mp4");
  const path = `${spaceId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return { url: data.publicUrl, type: isImage ? "photo" : "video" };
}

export async function createDrop(input: CreateDropInput) {
  const supabase = createClient();

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      space_id: input.spaceId,
      author_id: input.authorId,
      type: input.type,
      caption: input.caption || null,
      place: input.place || null,
      category: input.category || null,
      occurred_at: input.occurredAt || new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  if (input.mediaFiles?.length) {
    let i = 0;
    for (const file of input.mediaFiles) {
      const uploaded = await uploadMedia(input.spaceId, file);
      await supabase.from("post_media").insert({
        post_id: post.id,
        url: uploaded.url,
        media_type: uploaded.type,
        order_index: i++,
      });
    }
  }

  if (input.type === "song" && input.song) {
    await supabase.from("post_song_metadata").insert({
      post_id: post.id,
      title: input.song.title,
      artist: input.song.artist || null,
      album: input.song.album || null,
      artwork_url: input.song.artworkUrl || null,
      url: input.song.url || null,
      note: input.song.note || null,
    });
  }

  if (input.type === "favorite" && input.favorite) {
    await supabase.from("post_favorite_metadata").insert({
      post_id: post.id,
      favorite_type: input.favorite.favoriteType,
      item_name: input.favorite.itemName,
      note: input.favorite.note || null,
    });
  }

  if (input.tags?.length) {
    for (const name of input.tags) {
      const tagName = name.trim().toLowerCase();
      if (!tagName) continue;
      const { data: tag } = await supabase
        .from("tags")
        .upsert({ space_id: input.spaceId, name: tagName }, { onConflict: "space_id,name" })
        .select()
        .single();
      if (tag) {
        await supabase.from("post_tags").insert({ post_id: post.id, tag_id: tag.id });
      }
    }
  }

  if (input.otherMemberId) {
    await notify({
      spaceId: input.spaceId,
      userId: input.otherMemberId,
      type: "new_drop",
      category: "social",
      title: "New Drop",
      body: input.caption?.slice(0, 80) || `A new ${input.type} was dropped.`,
      data: { postId: post.id },
    });
  }

  return post;
}

export async function toggleReaction(
  postId: string,
  userId: string,
  emoji: string,
  spaceId: string,
  otherMemberId: string | null,
  postAuthorId: string
) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from("reactions").delete().eq("id", existing.id);
    return false;
  }

  await supabase.from("reactions").insert({ post_id: postId, user_id: userId, emoji });

  if (otherMemberId && postAuthorId !== userId) {
    await notify({
      spaceId,
      userId: otherMemberId,
      type: "reaction",
      category: "social",
      title: `Reacted ${emoji}`,
      data: { postId },
    });
  }
  return true;
}

export async function addComment(
  postId: string,
  authorId: string,
  body: string,
  spaceId: string,
  otherMemberId: string | null,
  postAuthorId: string
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: authorId, body })
    .select()
    .single();
  if (error) throw error;

  if (otherMemberId && postAuthorId !== authorId) {
    await notify({
      spaceId,
      userId: otherMemberId,
      type: "reply",
      category: "social",
      title: "New reply",
      body: body.slice(0, 80),
      data: { postId },
    });
  }
  return data;
}

export async function toggleSaved(postId: string, userId: string, spaceId: string) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("saved_items")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("saved_items").delete().eq("id", existing.id);
    return false;
  }
  await supabase.from("saved_items").insert({ post_id: postId, user_id: userId, space_id: spaceId });
  return true;
}

export async function toggleMemory(postId: string, current: boolean) {
  const supabase = createClient();
  await supabase.from("posts").update({ saved_to_memories: !current }).eq("id", postId);
  return !current;
}
