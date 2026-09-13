import Link from "next/link";
import { getSessionContext } from "@/services/session";
import { getFeed } from "@/services/posts-server";
import { getActiveStories } from "@/services/stories-server";
import { getResurfaced } from "@/services/resurfacing";
import { HomeHeader } from "@/components/home/HomeHeader";
import { StoryRail } from "@/components/StoryRail";
import { FeedPost } from "@/components/home/FeedPost";
import { EmptyHome } from "@/components/home/EmptyHome";

// Building this page piece by piece, confirming each part before adding
// the next. Step 4: top bar + story rail + resurfaced rail (all
// confirmed) + the feed itself.

export default async function HomePage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const [stories, resurfaced, posts] = await Promise.all([
    getActiveStories(ctx.space.id, ctx.userId),
    getResurfaced(ctx.space.id),
    getFeed(ctx.space.id, ctx.userId),
  ]);

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader unreadCount={ctx.unreadCount} />
      <StoryRail stories={stories} currentUserId={ctx.userId} />

      {resurfaced.length > 0 && (
        <div className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 pt-1">
          {resurfaced.map(({ label, post }) => (
            <Link
              key={post.id}
              href={`/memories/${post.id}`}
              className="flex min-h-[62px] w-[128px] shrink-0 snap-start flex-col justify-center gap-1 rounded-xl bg-white p-3 shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]"
            >
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#c99a2e]">{label}</span>
              <span className="truncate text-[13px] font-medium text-[#4a453d]">
                {post.caption || `A ${post.type} you kept`}
              </span>
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 ? <EmptyHome /> : posts.map((post) => <FeedPost key={post.id} post={post} />)}
    </div>
  );
}
