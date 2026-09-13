import { getSessionContext } from "@/services/session";
import { getRecentMedia } from "@/services/posts-server";
import { getDropInspiration } from "@/services/resurfacing";
import { DropLanding } from "@/components/drop/DropLanding";

// No header of its own -- reached from the BottomNav's center "+" (and
// from Story's "Add" tile via ?story=1). DropLanding's own title row is
// the page's only chrome until a type is picked, then DropComposer takes
// over with its own back-arrow header.

export default async function DropPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const [recentMedia, inspiration] = await Promise.all([
    getRecentMedia(ctx.space.id, ctx.userId, 8),
    getDropInspiration(ctx.space.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <DropLanding recentMedia={recentMedia} {...inspiration} />
    </div>
  );
}
