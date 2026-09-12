import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/services/session";
import { PostCard } from "@/components/PostCard";
import { AddToCollection } from "@/components/AddToCollection";
import type { FeedPost } from "@/lib/domain-types";

export default async function MemoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select(
      "*, author:profiles!posts_author_id_fkey(*), media:post_media(*), song:post_song_metadata(*), favorite:post_favorite_metadata(*), reactions(*)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!post) notFound();

  const [{ count: commentCount }, { data: saved }, { data: collections }, { data: allCollections }] = await Promise.all([
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", id),
    supabase.from("saved_items").select("id").eq("post_id", id).eq("user_id", ctx.userId).maybeSingle(),
    supabase
      .from("collection_items")
      .select("collections(id, name)")
      .eq("post_id", id),
    supabase.from("collections").select("id, name").eq("space_id", ctx.space.id),
  ]);

  const feedPost: FeedPost = {
    ...(post as unknown as FeedPost),
    commentCount: commentCount ?? 0,
    isSaved: !!saved,
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <PostCard post={feedPost} />
      <div className="mt-4 rounded-2xl border border-line p-4">
        <p className="mb-2 text-sm font-medium">Collections</p>
        <p className="mb-3 flex flex-wrap gap-1.5 text-xs text-ink-soft">
          {collections?.length
            ? collections.map((c) => (
                <span key={(c.collections as unknown as { id: string }).id} className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">
                  {(c.collections as unknown as { name: string }).name}
                </span>
              ))
            : "Not in any collection yet."}
        </p>
        <AddToCollection postId={post.id} collections={allCollections ?? []} spaceId={ctx.space.id} userId={ctx.userId} />
      </div>
    </div>
  );
}
