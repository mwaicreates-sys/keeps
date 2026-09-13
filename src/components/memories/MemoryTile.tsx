import Link from "next/link";
import { Music2, Star, MapPin, Play } from "lucide-react";
import type { FeedPost } from "@/lib/domain-types";

function dateChip(occurredAt: string) {
  return new Date(occurredAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * The Memories/Collections grid tile — one coherent visual system
 * (rounded, light, edge-to-edge imagery where there is any) but a
 * different treatment per Drop type, so a song or a text thought reads as
 * useful content instead of a blank icon block. Kept separate from the
 * shared MemoryCard (used by Profile's own tabs) so future changes here
 * don't reach Profile without a deliberate decision to share it there too.
 */
export function MemoryTile({ post }: { post: FeedPost }) {
  const cover = post.media[0]?.url;
  const isVideo = post.media[0]?.media_type === "video";

  return (
    <Link
      href={`/memories/${post.id}`}
      className="group relative block aspect-square overflow-hidden rounded-[16px] bg-white"
    >
      {post.type === "song" && post.song ? (
        <SongTile title={post.song.title} artist={post.song.artist} artworkUrl={post.song.artwork_url} />
      ) : post.type === "text" ? (
        <TextTile caption={post.caption} occurredAt={post.occurred_at} />
      ) : (post.type === "activity" || post.type === "place") && !cover ? (
        <PlaceTile place={post.place} />
      ) : post.type === "favorite" && !cover ? (
        <FavoriteTile itemName={post.favorite?.item_name} />
      ) : cover ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
          {isVideo && (
            <span className="absolute inset-0 grid place-items-center bg-black/10">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
                <Play size={16} fill="currentColor" strokeWidth={0} />
              </span>
            </span>
          )}
          {post.type === "favorite" && (
            <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-[#c99a2e]">
              <Star size={13} fill="currentColor" />
            </span>
          )}
          <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {dateChip(post.occurred_at)}
          </span>
        </>
      ) : (
        <TextTile caption={post.caption} occurredAt={post.occurred_at} />
      )}
    </Link>
  );
}

function SongTile({
  title,
  artist,
  artworkUrl,
}: {
  title: string;
  artist: string | null;
  artworkUrl: string | null;
}) {
  return (
    <div className="relative h-full w-full">
      {artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={artworkUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#eee6d6] to-[#e2ece9]">
          <Music2 size={26} className="text-white/90" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent px-2 pb-1.5 pt-6">
        <p className="truncate text-[12.5px] font-semibold text-white">{title}</p>
        {artist && <p className="truncate text-[11px] text-white/75">{artist}</p>}
      </div>
      <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-[#3a362f]">
        <Music2 size={12} />
      </span>
    </div>
  );
}

function TextTile({ caption, occurredAt }: { caption: string | null; occurredAt: string }) {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-[#f7f5f1] p-3">
      <p className="line-clamp-4 text-[13px] leading-snug text-[#3a362f]">{caption || "A thought worth keeping."}</p>
      <p className="text-[10.5px] text-[#a39d92]">{dateChip(occurredAt)}</p>
    </div>
  );
}

function PlaceTile({ place }: { place: string | null }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#dcece3] via-[#e8f0e0] to-[#d9e7ee] p-2 text-center">
      <MapPin size={22} className="fill-[#3b82f6] text-[#3b82f6]" />
      <p className="line-clamp-2 text-[12.5px] font-medium text-[#3a362f]">{place || "Somewhere together"}</p>
    </div>
  );
}

function FavoriteTile({ itemName }: { itemName: string | undefined }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-1.5 bg-[#fdf3e0] p-2 text-center">
      <Star size={22} className="fill-[#c99a2e] text-[#c99a2e]" />
      <p className="line-clamp-2 text-[12.5px] font-medium text-[#3a362f]">{itemName || "A favorite"}</p>
    </div>
  );
}
