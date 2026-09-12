import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderHeart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/services/session";
import { HomeHeader } from "@/components/home/HomeHeader";
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

  const [{ count: commentCount }, { data: saved }, { data: collections }, { data: allCollections }, { count: unreadCount }] =
    await Promise.all([
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", id),
      supabase.from("saved_items").select("id").eq("post_id", id).eq("user_id", ctx.userId).maybeSingle(),
      supabase.from("collection_items").select("collections(id, name)").eq("post_id", id),
      supabase.from("collections").select("id, name").eq("space_id", ctx.space.id),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).is("read_at", null),
    ]);

  const feedPost: FeedPost = {
    ...(post as unknown as FeedPost),
    commentCount: commentCount ?? 0,
    isSaved: !!saved,
  };

  return (
    <div className="mx-auto max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader unreadCount={unreadCount ?? 0} />

      <div className="mb-3 px-4">
        <Link
          href="/memories"
          aria-label="Back to Memories"
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#3a362f] shadow-sm"
        >
          <ArrowLeft size={19} />
        </Link>
      </div>

      <div className="px-4">
        <PostCard post={feedPost} />

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-[0_2px_16px_-6px_rgba(20,18,15,0.12)]">
          <div className="mb-2.5 flex items-center gap-1.5">
            <FolderHeart size={16} className="text-[#a3742b]" />
            <p className="text-[15px] font-semibold text-[#3a362f]">Albums</p>
          </div>
          {collections?.length ? (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {collections.map((c) => (
                <span
                  key={(c.collections as unknown as { id: string }).id}
                  className="rounded-full bg-[#faf1e2] px-3 py-1 text-[13px] font-medium text-[#a3742b]"
                >
                  {(c.collections as unknown as { name: string }).name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mb-3 text-[13.5px] text-[#a39d92]">Not in any album yet.</p>
          )}
          <AddToCollection postId={post.id} collections={allCollections ?? []} spaceId={ctx.space.id} userId={ctx.userId} />
        </div>
      </div>
    </div>
  );
}
