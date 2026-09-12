import Link from "next/link";
import { Music2, Type as TypeIcon, Star, Activity } from "lucide-react";
import type { FeedPost } from "@/lib/domain-types";

export function MemoryCard({ post }: { post: FeedPost }) {
  const cover = post.media[0]?.url;
  const year = new Date(post.occurred_at).getFullYear();

  return (
    <Link
      href={`/memories/${post.id}`}
      className="group relative aspect-square overflow-hidden rounded-xl bg-paper-raised"
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 border border-line p-3 text-center">
          {post.type === "song" ? (
            <Music2 size={20} className="text-ink-soft" />
          ) : post.type === "favorite" ? (
            <Star size={20} className="text-ink-soft" />
          ) : post.type === "activity" ? (
            <Activity size={20} className="text-ink-soft" />
          ) : (
            <TypeIcon size={20} className="text-ink-soft" />
          )}
          <p className="line-clamp-3 text-xs text-ink-soft">
            {post.caption || post.song?.title || post.favorite?.item_name || "Untitled"}
          </p>
        </div>
      )}
      <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
        {year}
      </span>
    </Link>
  );
}
