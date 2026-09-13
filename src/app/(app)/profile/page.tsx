import Link from "next/link";
import { Grid3x3, ListOrdered, Star, Bookmark, Images, Users, ChevronRight } from "lucide-react";
import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";
import { getPostsByAuthor, getSavedPosts } from "@/services/posts-server";
import { getActiveStories } from "@/services/stories-server";
import { getAlbums } from "@/services/collections-server";
import { getTop5Lists } from "@/services/top5-server";
import { HomeHeader } from "@/components/home/HomeHeader";
import { ProfileHeader, type RecentSong } from "@/components/profile/ProfileHeader";
import { PostTile, PostTileVisual } from "@/components/profile/PostTile";
import { AlbumCard } from "@/components/profile/AlbumCard";
import { CreateAlbumButton } from "@/components/profile/CreateAlbumButton";
import { AccountSwitcher } from "@/components/profile/AccountSwitcher";
import { EmptyState } from "@/components/EmptyState";
import { timeAgo } from "@/lib/utils";
import type { FeedPost } from "@/lib/domain-types";

// Same minimal (logo-only) header as Search/Memories -- Profile doesn't
// need its own shortcut back to Search/Notifications.

const TABS = [
  { key: "posts", label: "Posts", icon: Grid3x3 },
  { key: "top5", label: "Top 5s", icon: ListOrdered },
  { key: "favorites", label: "Favorites", icon: Star },
  { key: "saved", label: "Saved", icon: Bookmark },
  { key: "albums", label: "Albums", icon: Images },
] as const;
type Tab = (typeof TABS)[number]["key"];

function dropLabel(post: FeedPost) {
  if (post.type === "text") return post.caption ?? "A thought";
  if (post.song) return `${post.song.title}${post.song.artist ? ` · ${post.song.artist}` : ""}`;
  if (post.favorite) return post.favorite.item_name;
  if (post.place) return post.place;
  return post.caption || (post.type === "photo" ? "A photo" : post.type === "video" ? "A video" : "A memory");
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: Tab }>;
}) {
  const { tab = "posts" } = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const supabase = await createClient();

  const [{ count: memoryCount }, { count: gamesPlayed }, stories, { data: songRow }, authorPosts] = await Promise.all([
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("space_id", ctx.space.id)
      .eq("author_id", ctx.userId)
      .eq("saved_to_memories", true),
    supabase.from("game_answers").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId),
    getActiveStories(ctx.space.id, ctx.userId),
    supabase
      .from("posts")
      .select("id, created_at, author:profiles!posts_author_id_fkey(display_name), post_song_metadata!inner(title, artist, artwork_url)")
      .eq("space_id", ctx.space.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getPostsByAuthor(ctx.space.id, ctx.userId, ctx.userId),
  ]);

  const song = (songRow?.post_song_metadata as { title: string; artist: string | null; artwork_url: string | null } | null) ?? null;
  const recentSong: RecentSong | null =
    songRow && song
      ? {
          postId: songRow.id as string,
          title: song.title,
          artist: song.artist,
          artworkUrl: song.artwork_url,
          authorName: (songRow.author as { display_name: string }).display_name,
          createdAt: songRow.created_at as string,
        }
      : null;

  const [top5Lists, savedPosts, albums] = await Promise.all([
    tab === "top5" ? getTop5Lists(ctx.space.id, ctx.userId) : Promise.resolve([]),
    tab === "saved" ? getSavedPosts(ctx.userId) : Promise.resolve([]),
    tab === "albums" ? getAlbums(ctx.space.id) : Promise.resolve([]),
  ]);

  const favoritePosts = authorPosts.filter((p) => p.type === "favorite");
  const recentDrops = authorPosts.slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader minimal />

      <ProfileHeader
        profile={ctx.profile}
        otherMember={ctx.otherMember}
        hasActiveStory={stories.some((s) => s.author_id === ctx.userId)}
        recentSong={recentSong}
      />

      {recentDrops.length > 0 && (
        <div className="mb-4 px-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[15px] font-bold text-[#3a362f]">Recent Drops</p>
            <Link href={`/memories?author=${ctx.userId}`} className="flex items-center gap-0.5 text-[12px] font-medium text-[#c99a2e]">
              See all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentDrops.map((post) => (
              <Link
                key={post.id}
                href={`/memories/${post.id}`}
                className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]"
              >
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl">
                  <PostTileVisual post={post} />
                </div>
                <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[#3a362f]">{dropLabel(post)}</p>
                <span className="shrink-0 rounded-full bg-[#f2efe9] px-2 py-1 text-[10.5px] font-medium text-[#a39d92]">
                  {timeAgo(post.created_at)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between px-4 text-[13px]">
        <p className="text-[#7c766c]">
          <span className="font-bold text-[#3a362f]">{memoryCount ?? 0}</span> memories &nbsp;·&nbsp;
          <span className="font-bold text-[#3a362f]">{gamesPlayed ?? 0}</span> games played
        </p>
        <Link href="/profile/us" className="flex items-center gap-1 font-semibold text-[#c99a2e]">
          <Users size={14} /> Us page
        </Link>
      </div>

      <div className="mb-4 px-4">
        <AccountSwitcher />
      </div>

      <div className="mb-4 px-4">
        <Link href="/credits" className="text-[12.5px] font-medium text-[#a39d92] underline underline-offset-2">
          Credits
        </Link>
      </div>

      <div className="no-scrollbar mb-4 flex gap-4 overflow-x-auto border-b border-[#eee9e2] px-4">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <Link
              key={key}
              href={`/profile?tab=${key}`}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 text-[12.5px] font-semibold ${
                active ? "border-[#3a362f] text-[#3a362f]" : "border-transparent text-[#a39d92]"
              }`}
            >
              <Icon size={15} strokeWidth={active ? 2.4 : 2} /> {label}
            </Link>
          );
        })}
      </div>

      <div className="px-4">
        {tab === "posts" &&
          (authorPosts.length === 0 ? (
            <EmptyState icon={Grid3x3} title="No Drops yet" body="Everything you share shows up here." />
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {authorPosts.map((post) => (
                <PostTile key={post.id} post={post} />
              ))}
            </div>
          ))}

        {tab === "favorites" &&
          (favoritePosts.length === 0 ? (
            <EmptyState icon={Star} title="No favorites yet" body="Drop something you love to see it here." />
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {favoritePosts.map((post) => (
                <PostTile key={post.id} post={post} />
              ))}
            </div>
          ))}

        {tab === "saved" &&
          (savedPosts.length === 0 ? (
            <EmptyState icon={Bookmark} title="Nothing saved yet" body="Tap the bookmark on a post to keep it here." />
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {savedPosts.map((post) => (
                <PostTile key={post.id} post={post} />
              ))}
            </div>
          ))}

        {tab === "top5" &&
          (top5Lists.length === 0 ? (
            <EmptyState icon={ListOrdered} title="No Top 5s yet" body="Play My Top 5 in Play to start one." />
          ) : (
            <div className="space-y-2.5">
              {top5Lists.map((list) => (
                <div key={list.id} className="rounded-2xl bg-white p-3.5 shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[13.5px] font-semibold text-[#3a362f]">{list.topic}</p>
                    <span className="shrink-0 text-[11px] text-[#a39d92]">{timeAgo(list.createdAt)}</span>
                  </div>
                  <ol className="space-y-1">
                    {list.items.map((item, i) => (
                      <li key={i} className="text-[12.5px] text-[#5c574c]">
                        {i + 1}. {item}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          ))}

        {tab === "albums" && (
          <>
            <div className="mb-3 flex justify-end">
              <CreateAlbumButton spaceId={ctx.space.id} userId={ctx.userId} />
            </div>
            {albums.length === 0 ? (
              <EmptyState icon={Images} title="No albums yet" body="Group your favorite Drops into a collection." />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {albums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
