import Link from "next/link";
import { Music2, Star, MapPin } from "lucide-react";
import type { FeedPost } from "@/lib/domain-types";

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Just the cover art/fallback for a post -- no link, no overlay badges.
 * Used both by PostTile's grid squares (wrapped with a link + badges
 * below) and standalone at small sizes (Profile's "Recent Drops" row),
 * where the date/type badges PostTile adds would be oversized. */
export function PostTileVisual({ post }: { post: FeedPost }) {
  const photo = post.media.find((m) => m.media_type === "photo");
  const video = post.media.find((m) => m.media_type === "video");

  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />;
  }
  if (video) {
    return <video src={video.url} muted playsInline className="h-full w-full object-cover" />;
  }
  if (post.song) {
    return post.song.artwork_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={post.song.artwork_url} alt="" loading="lazy" className="h-full w-full object-cover" />
    ) : (
      <div className="grid h-full w-full place-items-center bg-[#e9e4da] text-[#7c766c]">
        <Music2 size={16} />
      </div>
    );
  }
  if (post.favorite) {
    return (
      <div className="grid h-full w-full place-items-center bg-[#fdf3e0] text-[#c99a2e]">
        <Star size={16} />
      </div>
    );
  }
  if (post.type === "activity" || post.place) {
    return (
      <div className="grid h-full w-full place-items-center bg-[#eaf3ee] text-[#3f7a5c]">
        <MapPin size={16} />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center p-1 text-center text-[8px] font-medium leading-snug text-[#7c766c]">
      {post.caption ? `“${post.caption}”` : "A memory"}
    </div>
  );
}

/** One square in the Profile grid tabs (Posts/Favorites/Saved) — a real
 * cover (photo/video/song artwork) when the post has one, a type-
 * appropriate fallback icon otherwise, a date chip, and a small type
 * badge for songs so they don't look like a broken image. */
export function PostTile({ post }: { post: FeedPost }) {
  return (
    <Link href={`/memories/${post.id}`} className="relative block aspect-square overflow-hidden rounded-lg bg-[#f2efe9]">
      <PostTileVisual post={post} />

      <span className="absolute bottom-1 left-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-medium text-white">
        {dayLabel(post.occurred_at)}
      </span>
      {post.type === "song" && (
        <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/45 text-white">
          <Music2 size={11} />
        </span>
      )}
    </Link>
  );
}
