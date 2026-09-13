import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSessionContext } from "@/services/session";
import { getPost } from "@/services/posts-server";
import { FeedPost } from "@/components/home/FeedPost";

// Own header (back arrow + title) -- same convention as Notifications;
// the Home top bar only appears on Home itself. The card underneath is
// the same FeedPost used in the Home feed, just framed as a permalink
// and opened straight into its replies.

export default async function MemoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const post = await getPost(id, ctx.userId);
  if (!post || post.space_id !== ctx.space.id) notFound();

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <div className="flex items-center gap-2 px-3 pb-2 pt-2">
        <Link href="/memories" aria-label="Back" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#3a362f]">
          <ArrowLeft size={20} strokeWidth={2} />
        </Link>
        <p className="text-[17px] font-bold tracking-tight text-[#3a362f]">Memory</p>
      </div>

      <FeedPost post={post} initialShowComments />
    </div>
  );
}
