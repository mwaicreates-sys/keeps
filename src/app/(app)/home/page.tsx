import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";
import { getActiveStories } from "@/services/stories-server";
import { HomeHeader } from "@/components/home/HomeHeader";
import { StoryRail } from "@/components/StoryRail";

// Building this page piece by piece, confirming each part before adding
// the next. Step 2: top bar (confirmed) + story rail.

export default async function HomePage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const [{ count: unreadCount }, stories] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .is("read_at", null),
    getActiveStories(ctx.space.id, ctx.userId),
  ]);

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader unreadCount={unreadCount ?? 0} />
      <StoryRail stories={stories} currentUserId={ctx.userId} />
    </div>
  );
}
