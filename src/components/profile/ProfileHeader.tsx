import Link from "next/link";
import { ChevronRight, Headphones, Sparkles } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/utils";
import type { Tables } from "@/lib/types";

export type RecentSong = {
  postId: string;
  title: string;
  artist: string | null;
  artworkUrl: string | null;
  authorName: string;
  createdAt: string;
};

export function ProfileHeader({
  profile,
  otherMember,
  hasActiveStory,
  recentSong,
}: {
  profile: Tables<"profiles">;
  otherMember: Tables<"profiles"> | null;
  /** A small "story is live right now" badge on the avatar — real state,
   * not decoration; only shows when this person actually has an active
   * (unexpired) story. */
  hasActiveStory: boolean;
  recentSong: RecentSong | null;
}) {
  return (
    <div className="mx-4 mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#efe9f7] to-[#fbeaf0] px-5 pb-4 pt-6 text-center">
      <div className="relative mx-auto inline-block">
        <Avatar name={profile.display_name} url={profile.avatar_url} size={88} />
        {hasActiveStory && (
          <span
            className="absolute -left-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-[#3fae7a] text-white ring-2 ring-white"
            aria-label="Story is live"
          >
            <Sparkles size={13} />
          </span>
        )}
      </div>

      <p className="mt-3 text-[19px] font-bold text-[#3a362f]">{profile.display_name}</p>
      <p className="text-[13px] text-[#a39d92]">@{profile.handle}</p>

      {otherMember && (
        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/70 py-1 pl-1 pr-3">
          <Avatar name={otherMember.display_name} url={otherMember.avatar_url} size={20} />
          <span className="text-[12px] text-[#7c766c]">
            with <span className="font-semibold text-[#3a362f]">{otherMember.display_name}</span>
          </span>
        </div>
      )}

      {profile.interests.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {profile.interests.slice(0, 6).map((tag) => (
            <span key={tag} className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-[#5c574c]">
              {tag}
            </span>
          ))}
        </div>
      )}

      {recentSong && (
        <Link
          href={`/memories/${recentSong.postId}`}
          className="mt-3.5 flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 text-left shadow-[0_2px_10px_-6px_rgba(20,18,15,0.15)]"
        >
          {recentSong.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recentSong.artworkUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#e9e4da] text-[#7c766c]">
              <Headphones size={16} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#3a362f]">
              {recentSong.title}
              {recentSong.artist && ` · ${recentSong.artist}`}
            </p>
            <p className="truncate text-[11px] text-[#a39d92]">
              Last shared by {recentSong.authorName} · {timeAgo(recentSong.createdAt)}
            </p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-[#c7c1b6]" />
        </Link>
      )}
    </div>
  );
}
