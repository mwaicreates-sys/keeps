import Link from "next/link";
import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";
import { getPostsByAuthor } from "@/services/posts-server";
import { Avatar } from "@/components/Avatar";
import { MemoryCard } from "@/components/MemoryCard";
import { EmptyState } from "@/components/EmptyState";
import { HomeHeader } from "@/components/home/HomeHeader";
import { AccountSwitcher } from "@/components/profile/AccountSwitcher";
import { AlbumCard, type AlbumSummary } from "@/components/profile/AlbumCard";
import { CreateAlbumButton } from "@/components/profile/CreateAlbumButton";
import { timeAgo } from "@/lib/utils";
import { Grid3x3, ListOrdered, Star, Bookmark, Users, Headphones, ChevronRight, Sparkles, FolderHeart, Pencil } from "lucide-react";

const TABS = [
  { key: "posts", label: "Posts", icon: Grid3x3 },
  { key: "albums", label: "Albums", icon: FolderHeart },
  { key: "top5s", label: "Top 5s", icon: ListOrdered },
  { key: "favorites", label: "Favorites", icon: Star },
  { key: "saved", label: "Saved", icon: Bookmark },
] as const;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: (typeof TABS)[number]["key"] }>;
}) {
  const { tab = "posts" } = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const supabase = await createClient();

  const [{ count: memoryCount }, { count: gameCount }, posts, { data: lastSongRow }, { count: unreadCount }] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("space_id", ctx.space.id).eq("saved_to_memories", true),
    supabase.from("game_sessions").select("id", { count: "exact", head: true }).eq("space_id", ctx.space.id).eq("status", "completed"),
    getPostsByAuthor(ctx.space.id, ctx.userId, ctx.userId),
    supabase
      .from("posts")
      .select("id, created_at, author:profiles!posts_author_id_fkey(display_name), song:post_song_metadata(title, artist, url)")
      .eq("space_id", ctx.space.id)
      .eq("type", "song")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).is("read_at", null),
  ]);

  const lastSong = lastSongRow?.song
    ? {
        postId: lastSongRow.id,
        title: lastSongRow.song.title,
        artist: lastSongRow.song.artist,
        url: lastSongRow.song.url,
        author: (lastSongRow.author as unknown as { display_name: string } | null)?.display_name,
        createdAt: lastSongRow.created_at,
      }
    : null;

  let tabPosts = posts;
  let top5s: { id: string; topic: string; created_at: string }[] = [];
  let albums: AlbumSummary[] = [];

  if (tab === "albums") {
    const { data: collectionsRaw } = await supabase
      .from("collections")
      .select("id, name, created_at, collection_items(post_id, posts(media:post_media(url)))")
      .eq("space_id", ctx.space.id)
      .order("created_at", { ascending: false });

    albums = (collectionsRaw ?? []).map((c) => {
      const items = (c.collection_items ?? []) as { posts: { media: { url: string }[] | null } | null }[];
      const covers = items.map((i) => i.posts?.media?.[0]?.url).filter((u): u is string => !!u);
      return { id: c.id as string, name: c.name as string, count: items.length, createdAt: c.created_at as string, covers };
    });
  } else if (tab === "favorites") {
    tabPosts = posts.filter((p) => p.type === "favorite");
  } else if (tab === "top5s") {
    const { data } = await supabase
      .from("top5_lists")
      .select("id, topic, created_at")
      .eq("space_id", ctx.space.id)
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false });
    top5s = data ?? [];
  } else if (tab === "saved") {
    const { data: savedRows } = await supabase.from("saved_items").select("post_id").eq("user_id", ctx.userId);
    const ids = new Set((savedRows ?? []).map((s) => s.post_id));
    tabPosts = posts.filter((p) => ids.has(p.id));
  }

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader unreadCount={unreadCount ?? 0} />

      <div className="mx-4 mb-4 overflow-hidden rounded-[26px] bg-white px-5 pb-5 pt-6 shadow-[0_2px_16px_-6px_rgba(20,18,15,0.12)]">
        <div className="flex items-start justify-between">
          <div className="relative w-fit">
            <Avatar name={ctx.profile.display_name} url={ctx.profile.avatar_url} size={84} shape="square" />
            {(memoryCount ?? 0) > 0 && (
              <span className="absolute -bottom-1.5 -right-2 rounded-xl bg-[#3a362f] px-2 py-0.5 text-[12px] font-bold text-white shadow-sm">
                {memoryCount}
              </span>
            )}
          </div>
          <Link
            href="/profile/edit"
            className="flex items-center gap-1.5 rounded-full bg-[#f2efe9] px-3.5 py-2 text-[13.5px] font-medium text-[#3a362f]"
          >
            <Pencil size={13} /> Edit profile
          </Link>
        </div>

        <p className="mt-3 text-[22px] font-bold leading-tight text-[#3a362f]">{ctx.profile.display_name}</p>
        <p className="text-[14.5px] text-[#a39d92]">@{ctx.profile.handle}</p>

        {ctx.profile.bio && <p className="mt-2 text-[14.5px] leading-[1.4] text-[#5c574c]">{ctx.profile.bio}</p>}

        {ctx.otherMember && (
          <Link
            href="/profile/us"
            className="mt-3 flex w-fit items-center gap-2 rounded-full bg-[#f7f5f1] py-1.5 pl-1.5 pr-4 text-[14px] text-[#5c574c]"
          >
            <Avatar name={ctx.otherMember.display_name} url={ctx.otherMember.avatar_url} size={24} />
            with <strong className="text-[#3a362f]">{ctx.otherMember.display_name}</strong>
          </Link>
        )}

        {ctx.profile.interests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ctx.profile.interests.map((i) => (
              <span key={i} className="rounded-full bg-[#f2efe9] px-3 py-1 text-[13px] font-medium text-[#5c574c]">
                {i}
              </span>
            ))}
          </div>
        )}

        {lastSong && (
          <a
            href={lastSong.url ?? `/memories/${lastSong.postId}`}
            target={lastSong.url ? "_blank" : undefined}
            rel="noreferrer"
            className="mt-4 flex items-center gap-3 rounded-2xl bg-[#f7f5f1] px-4 py-3 text-left"
          >
            <Headphones size={19} className="shrink-0 text-[#3a362f]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold text-[#3a362f]">
                {lastSong.title} {lastSong.artist && <span className="font-normal text-[#a39d92]">· {lastSong.artist}</span>}
              </p>
              <p className="text-[12.5px] text-[#a39d92]">
                Last shared by {lastSong.author} · {timeAgo(lastSong.createdAt)}
              </p>
            </div>
          </a>
        )}
      </div>

      {posts.length > 0 && (
        <div className="mb-6">
          <div className="mb-2.5 flex items-center justify-between px-4">
            <p className="text-[15px] font-semibold text-[#3a362f]">Recent Drops</p>
            <Link href="/profile?tab=posts" className="flex items-center text-[13.5px] font-medium text-[#a39d92]">
              See all <ChevronRight size={16} />
            </Link>
          </div>
          <ul className="space-y-1.5 px-4">
            {posts.slice(0, 3).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/memories/${p.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]"
                >
                  {p.media[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.media[0].url} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f2efe9] text-[#3a362f]">
                      <Sparkles size={15} />
                    </div>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[14.5px] text-[#3a362f]">
                    {p.caption || p.song?.title || p.favorite?.item_name || `A ${p.type}`}
                  </span>
                  <span className="shrink-0 rounded-full bg-[#f2efe9] px-2.5 py-1 text-[12px] text-[#a39d92]">
                    {timeAgo(p.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 flex items-center gap-4 px-4 text-[14px] text-[#a39d92]">
        <span><strong className="text-[#3a362f]">{memoryCount ?? 0}</strong> memories</span>
        <span><strong className="text-[#3a362f]">{gameCount ?? 0}</strong> games played</span>
        <Link href="/profile/us" className="ml-auto flex items-center gap-1.5 font-medium text-[#c99a2e]">
          <Users size={15} /> Us page
        </Link>
      </div>

      <div className="px-4">
        <AccountSwitcher />
      </div>

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={`/profile?tab=${key}`}
            className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium ${
              tab === key ? "bg-[#3a362f] text-white" : "bg-white text-[#7c766c]"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="px-4">
        {tab === "albums" ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[15px] font-semibold text-[#3a362f]">Your albums</p>
              <CreateAlbumButton spaceId={ctx.space.id} userId={ctx.userId} />
            </div>
            {albums.length === 0 ? (
              <EmptyState icon={FolderHeart} title="No albums yet" body="Create one and add memories to it from any Memory's detail page." />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {albums.map((a) => (
                  <AlbumCard key={a.id} album={a} />
                ))}
              </div>
            )}
          </div>
        ) : tab === "top5s" ? (
          top5s.length === 0 ? (
            <EmptyState icon={ListOrdered} title="No Top 5s yet" body="Play My Top 5 to start building history." />
          ) : (
            <ul className="space-y-2">
              {top5s.map((l) => (
                <li key={l.id} className="rounded-xl bg-white px-4 py-3 text-[14.5px] text-[#3a362f] shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]">
                  {l.topic}
                </li>
              ))}
            </ul>
          )
        ) : tabPosts.length === 0 ? (
          <EmptyState icon={TABS.find((t) => t.key === tab)!.icon} title="Nothing here yet" />
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {tabPosts.map((post) => (
              <MemoryCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
