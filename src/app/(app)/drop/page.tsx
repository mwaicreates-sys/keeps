import { getSessionContext } from "@/services/session";
import { getFeed, getRecentMedia } from "@/services/posts-server";
import { createClient } from "@/lib/supabase/server";
import { HomeHeader } from "@/components/home/HomeHeader";
import { DropLanding } from "@/components/drop/DropLanding";

export default async function DropPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const [recentMedia, recentPosts, { data: collections }, { count: unreadCount }] = await Promise.all([
    getRecentMedia(ctx.space.id, ctx.userId),
    getFeed(ctx.space.id, ctx.userId, 30),
    supabase.from("collections").select("id, name").eq("space_id", ctx.space.id).order("created_at", { ascending: false }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).is("read_at", null),
  ]);

  // Real, already-posted content used only as small illustrative scraps on
  // the Text/Activity cards — never fabricated copy, and never rendered at
  // all when the space has no such Drop yet.
  const recentCaption = recentPosts.find((p) => p.type === "text" && p.caption)?.caption ?? null;
  const recentPlace = recentPosts.find((p) => (p.type === "activity" || p.type === "place") && p.place)?.place ?? null;

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader unreadCount={unreadCount ?? 0} />
      <DropLanding
        recentMedia={recentMedia}
        collections={collections ?? []}
        recentCaption={recentCaption}
        recentPlace={recentPlace}
      />
    </div>
  );
}
