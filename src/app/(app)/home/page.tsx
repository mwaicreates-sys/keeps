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

// Home's light theme is applied one level up, on <main> itself (see
// MainSurface), so the whole scrollable surface shares it — not just this
// inner wrapper.

export default async function HomePage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const [posts, stories, resurfaced, { count: unreadCount }] = await Promise.all([
    getFeed(ctx.space.id, ctx.userId),
    getActiveStories(ctx.space.id, ctx.userId),
    getResurfaced(ctx.space.id),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .is("read_at", null),
  ]);

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader unreadCount={unreadCount ?? 0} />
      <StoryRail stories={stories} currentUserId={ctx.userId} />

      {resurfaced.length > 0 && (
        <div className="no-scrollbar mb-1 flex gap-3 overflow-x-auto px-4 pb-3">
          {resurfaced.map((r) => (
            <Link
              key={r.post.id}
              href={`/memories/${r.post.id}`}
              className="flex min-h-[86px] w-[168px] shrink-0 flex-col justify-center gap-1.5 rounded-2xl bg-white p-4 shadow-[0_2px_12px_-6px_rgba(20,18,15,0.12)]"
            >
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#c99a2e]">{r.label}</p>
              <p className="truncate text-[15.5px] font-medium text-[#4a453d]">{r.post.caption || `A ${r.post.type} you kept`}</p>
            </Link>
          ))}
        </div>
      )}

      <div>{posts.length === 0 ? <EmptyHome /> : posts.map((post) => <FeedPost key={post.id} post={post} />)}</div>
    </div>
  );
}
