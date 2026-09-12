import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/utils";
import type { Tables } from "@/lib/types";

function activityLine(post: {
  type: string;
  caption: string | null;
  mediaCount: number;
}): string {
  switch (post.type) {
    case "photo":
      return post.mediaCount > 1 ? `added ${post.mediaCount} photos` : "added a photo";
    case "video":
      return "added a video";
    case "song":
      return "shared a song";
    case "activity":
      return post.caption ? `is doing something` : "logged an activity";
    case "place":
      return "shared a place";
    case "favorite":
      return "added a favorite";
    case "milestone":
      return "marked a milestone";
    case "screenshot":
      return "saved a screenshot";
    case "link":
      return "shared a link";
    default:
      return "shared a thought";
  }
}

export function PostHeader({
  author,
  type,
  caption,
  mediaCount,
  createdAt,
}: {
  author: Tables<"profiles">;
  type: string;
  caption: string | null;
  mediaCount: number;
  createdAt: string;
}) {
  return (
    <div className="flex min-h-[58px] items-center gap-3 px-1 pb-2.5">
      <Avatar name={author.display_name} url={author.avatar_url} size={42} />
      <div className="min-w-0 flex-1">
        <p className="text-[15.5px] leading-tight text-[#3a362f]">
          <span className="font-semibold">{author.display_name}</span>{" "}
          <span className="text-[14px] text-[#7c766c]">{activityLine({ type, caption, mediaCount })}</span>
        </p>
      </div>
      <span className="shrink-0 text-[13px] text-[#a39d92]">{timeAgo(createdAt)}</span>
    </div>
  );
}
