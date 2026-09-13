import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/services/session";
import { getFeed } from "@/services/posts-server";
import { getActiveStories } from "@/services/stories-server";
import { getResurfaced } from "@/services/resurfacing";
import { StoryRail } from "@/components/StoryRail";
import { HomeHeader } from "@/components/home/HomeHeader";
import { FeedPost } from "@/components/home/FeedPost";
import { EmptyHome } from "@/components/home/EmptyHome";

async function loadHomeData(userId: string, spaceId: string) {
  const supabase = await createClient();
  const unread = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  const [feed, stories, resurfaced, unreadResult] = await Promise.all([
    getFeed(spaceId, userId),
    getActiveStories(spaceId, userId),
    getResurfaced(spaceId),
    unread,
  ]);

  return { feed, stories, resurfaced, unreadCount: unreadResult.count ?? 0 };
}

function ResurfacedRail({ items }: { items: Awaited<ReturnType<typeof getResurfaced>> }) {
  if (items.length === 0) return null;
  return (
    <div className="no-scrollbar mb-1 flex gap-3 overflow-x-auto px-4 pb-3">
      {items.map(({ label, post }) => (
        <Link
          key={post.id}
          href={`/memories/${post.id}`}
          className="flex min-h-[86px] w-[168px] shrink-0 flex-col justify-center gap-1.5 rounded-2xl bg-white p-4 shadow-[0_2px_12px_-6px_rgba(20,18,15,0.12)]"
        >
          <span className="text-[12px] font-bold uppercase tracking-wide text-[#c99a2e]">{label}</span>
          <span className="truncate text-[15.5px] font-medium text-[#4a453d]">
            {post.caption || `A ${post.type} you kept`}
          </span>
        </Link>
      ))}
    </div>
  );
}

function Feed({ posts }: { posts: Awaited<ReturnType<typeof getFeed>> }) {
  if (posts.length === 0) return <EmptyHome />;
  return (
    <>
      {posts.map((post) => (
        <FeedPost key={post.id} post={post} />
      ))}
    </>
  );
}

export default async function HomePage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const { feed, stories, resurfaced, unreadCount } = await loadHomeData(ctx.userId, ctx.space.id);

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader unreadCount={unreadCount} />
      <StoryRail stories={stories} currentUserId={ctx.userId} />
      <ResurfacedRail items={resurfaced} />
      <Feed posts={feed} />
    </div>
  );
}
