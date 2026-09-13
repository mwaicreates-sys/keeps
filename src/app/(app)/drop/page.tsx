import { getSessionContext } from "@/services/session";
import { getRecentMedia } from "@/services/posts-server";
import { createClient } from "@/lib/supabase/server";
import { DropLanding } from "@/components/drop/DropLanding";

// No header of its own -- reached from the BottomNav's center "+" (and
// from Story's "Add" tile via ?story=1). DropLanding's PageIntro is the
// page's only chrome until a type is picked, then DropComposer takes
// over with its own back-arrow header.

export default async function DropPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const supabase = await createClient();

  const [recentMedia, { data: collections }, { data: recentText }, { data: recentActivity }] = await Promise.all([
    getRecentMedia(ctx.space.id, ctx.userId, 8),
    supabase
      .from("collections")
      .select("id, name")
      .eq("space_id", ctx.space.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("posts")
      .select("caption")
      .eq("space_id", ctx.space.id)
      .eq("type", "text")
      .not("caption", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("posts")
      .select("place")
      .eq("space_id", ctx.space.id)
      .eq("type", "activity")
      .not("place", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <DropLanding
        recentMedia={recentMedia}
        collections={collections ?? []}
        recentCaption={recentText?.caption ?? null}
        recentPlace={recentActivity?.place ?? null}
      />
    </div>
  );
}
