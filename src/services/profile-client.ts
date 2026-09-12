"use client";

import { createClient } from "@/lib/supabase/client";

export async function updateProfile(
  userId: string,
  updates: { display_name?: string; handle?: string; bio?: string; interests?: string[]; avatar_url?: string }
) {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (error) throw error;
}

/**
 * Avatars are stored in the same `media` bucket as post uploads, so the
 * existing storage RLS policy (which requires the object path's first
 * folder segment to be a space the uploader belongs to) applies here too —
 * hence `${spaceId}/avatar-...` rather than a separate top-level prefix.
 */
export async function uploadAvatar(spaceId: string, userId: string, file: File) {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${spaceId}/avatar-${userId}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}
