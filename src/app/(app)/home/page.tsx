import Link from "next/link";
import { getSessionContext } from "@/services/session";
import { getFeed } from "@/services/posts-server";
import { getActiveStories } from "@/services/stories-server";
import { getResurfaced } from "@/services/resurfacing";
import { StoryRail } from "@/components/StoryRail";
import { PostCard } from "@/components/PostCard";
import { EmptyState } from "@/components/EmptyState";
import { Camera } from "lucide-react";

export default async function HomePage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const [posts, stories, resurfaced] = await Promise.all([
    getFeed(ctx.space.id, ctx.userId),
    getActiveStories(ctx.space.id, ctx.userId),
    getResurfaced(ctx.space.id),
  ]);

  return (
    <div className="mx-auto max-w-xl md:max-w-2xl md:px-4 md:py-6">
      <StoryRail stories={stories} currentUserId={ctx.userId} />

      {resurfaced.length > 0 && (
        <div className="no-scrollbar mb-2 flex gap-3 overflow-x-auto px-4 pb-2 md:px-0">
          {resurfaced.map((r) => (
            <Link
              key={r.post.id}
              href={`/memories/${r.post.id}`}
              className="flex w-52 shrink-0 flex-col gap-1 rounded-2xl border border-line bg-paper-raised p-3"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gold">{r.label}</p>
              <p className="truncate text-sm text-ink-soft">{r.post.caption || `A ${r.post.type} you kept`}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="md:space-y-4">
        {posts.length === 0 ? (
          <div className="px-4 md:px-0">
            <EmptyState
              icon={Camera}
              title="Nothing here yet"
              body="Drop the first photo, song, or thought — it'll show up here for both of you."
              action={
                <Link href="/drop" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper">
                  Make a Drop
                </Link>
              }
            />
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
