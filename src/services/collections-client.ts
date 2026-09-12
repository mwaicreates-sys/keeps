"use client";

import { createClient } from "@/lib/supabase/client";

export async function createCollection(spaceId: string, createdBy: string, name: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("collections")
    .insert({ space_id: spaceId, name, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addToCollection(collectionId: string, postId: string) {
  const supabase = createClient();
  // References only — never duplicates the underlying post.
  await supabase.from("collection_items").upsert({ collection_id: collectionId, post_id: postId });
}

export async function removeFromCollection(collectionId: string, postId: string) {
  const supabase = createClient();
  await supabase
    .from("collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("post_id", postId);
}

export async function renameCollection(collectionId: string, name: string) {
  const supabase = createClient();
  await supabase.from("collections").update({ name }).eq("id", collectionId);
}

export async function setCollectionCover(collectionId: string, coverUrl: string) {
  const supabase = createClient();
  await supabase.from("collections").update({ cover_url: coverUrl }).eq("id", collectionId);
}
