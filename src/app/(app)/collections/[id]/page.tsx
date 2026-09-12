import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/services/session";
import { MemoryCard } from "@/components/MemoryCard";
import { EmptyState } from "@/components/EmptyState";
import { FolderHeart } from "lucide-react";
import type { FeedPost } from "@/lib/domain-types";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: collection } = await supabase.from("collections").select("*").eq("id", id).maybeSingle();
  if (!collection) notFound();

  const { data: items } = await supabase
    .from("collection_items")
    .select(
      "post_id, posts(*, author:profiles!posts_author_id_fkey(*), media:post_media(*), song:post_song_metadata(*), favorite:post_favorite_metadata(*), reactions(*))"
    )
    .eq("collection_id", id)
    .order("added_at", { ascending: false });

  const posts = (items ?? [])
    .map((i) => i.posts as unknown as FeedPost)
    .filter(Boolean)
    .map((p) => ({ ...p, commentCount: 0, isSaved: false }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <FolderHeart size={22} className="text-gold" />
        <h1 className="font-display text-2xl">{collection.name}</h1>
      </div>
      {posts.length === 0 ? (
        <EmptyState icon={FolderHeart} title="Nothing added yet" body="Add memories from any Memory's detail page." />
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
          {posts.map((post) => (
            <MemoryCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
