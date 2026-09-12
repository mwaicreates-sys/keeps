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

// Home is always this light, "alive" social surface regardless of system
// theme — Memories/Play/Profile keep their own visual language.
const HOME_LIGHT_THEME = {
  "--paper": "#faf9f6",
  "--paper-raised": "#ffffff",
  "--ink": "#3a362f",
  "--ink-soft": "#a39d92",
  "--line": "#eee9e2",
} as React.CSSProperties;

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
    <div className="mx-auto max-w-xl bg-paper pb-4 md:max-w-2xl md:rounded-3xl md:py-4" style={HOME_LIGHT_THEME}>
      <HomeHeader unreadCount={unreadCount ?? 0} />
      <StoryRail stories={stories} currentUserId={ctx.userId} />

      {resurfaced.length > 0 && (
        <div className="no-scrollbar mb-1 flex gap-2.5 overflow-x-auto px-4 pb-3">
          {resurfaced.map((r) => (
            <Link
              key={r.post.id}
              href={`/memories/${r.post.id}`}
              className="flex w-48 shrink-0 flex-col gap-1 rounded-2xl bg-white p-3 shadow-[0_2px_12px_-6px_rgba(20,18,15,0.12)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#d4a72c]">{r.label}</p>
              <p className="truncate text-sm text-[#7c766c]">{r.post.caption || `A ${r.post.type} you kept`}</p>
            </Link>
          ))}
        </div>
      )}

      <div>{posts.length === 0 ? <EmptyHome /> : posts.map((post) => <FeedPost key={post.id} post={post} />)}</div>
    </div>
  );
}
