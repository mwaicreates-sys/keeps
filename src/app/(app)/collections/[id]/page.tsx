import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FolderHeart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/services/session";
import { HomeHeader } from "@/components/home/HomeHeader";
import { MemoryTile } from "@/components/memories/MemoryTile";
import { EmptyState } from "@/components/EmptyState";
import type { FeedPost } from "@/lib/domain-types";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const [{ data: collection }, { data: items }, { count: unreadCount }] = await Promise.all([
    supabase.from("collections").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("collection_items")
      .select(
        "post_id, posts(*, author:profiles!posts_author_id_fkey(*), media:post_media(*), song:post_song_metadata(*), favorite:post_favorite_metadata(*), reactions(*))"
      )
      .eq("collection_id", id)
      .order("added_at", { ascending: false }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).is("read_at", null),
  ]);
  if (!collection) notFound();

  const posts = (items ?? [])
    .map((i) => i.posts as unknown as FeedPost)
    .filter(Boolean)
    .map((p) => ({ ...p, commentCount: 0, isSaved: false }));

  const cover = posts.map((p) => p.media[0]?.url).find((u): u is string => !!u) ?? null;

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader unreadCount={unreadCount ?? 0} />

      <div className="mb-3 px-4">
        <Link
          href="/profile?tab=albums"
          aria-label="Back to Albums"
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#3a362f] shadow-sm"
        >
          <ArrowLeft size={19} />
        </Link>
      </div>

      <div
        className="relative mx-4 mb-5 flex h-36 flex-col justify-end overflow-hidden rounded-[24px] p-4 shadow-[0_4px_20px_-8px_rgba(20,18,15,0.2)]"
        style={!cover ? { backgroundColor: "#faf1e2" } : undefined}
      >
        {cover && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          </>
        )}
        <div className="relative z-10 flex items-center gap-2">
          <FolderHeart size={18} className={cover ? "text-white/80" : "text-[#a3742b]"} />
          <p className={`truncate text-[21px] font-bold ${cover ? "text-white" : "text-[#3a362f]"}`}>{collection.name}</p>
        </div>
        <p className={`relative z-10 text-[13.5px] ${cover ? "text-white/75" : "text-[#a3742b]"}`}>
          {posts.length} {posts.length === 1 ? "memory" : "memories"}
        </p>
      </div>

      <div className="px-4">
        {posts.length === 0 ? (
          <EmptyState icon={FolderHeart} title="Nothing added yet" body="Add memories from any Memory's detail page." />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {posts.map((post) => (
              <MemoryTile key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
