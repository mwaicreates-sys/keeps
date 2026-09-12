import { Plus, Music2, Type as TypeIcon } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { StoryWithAuthor } from "@/services/stories-server";

/** The "Start a story" tile — always first in the rail. */
export function AddStoryTile({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <div className="flex w-20 shrink-0 flex-col items-center gap-1.5">
      <div className="relative h-28 w-20 overflow-hidden rounded-[22px] bg-[#f2efe9]">
        <div className="grid h-full w-full place-items-center">
          <Avatar name={name} url={avatarUrl} size={44} />
        </div>
        <span className="absolute bottom-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-[#3b82f6] text-white ring-2 ring-white">
          <Plus size={14} strokeWidth={2.5} />
        </span>
      </div>
      <span className="text-[11px] text-[#7c766c]">Add story</span>
    </div>
  );
}

/** One rounded-rectangle, portrait story tile with an overlapping avatar. */
export function StoryTile({ story, unseen, onOpen }: { story: StoryWithAuthor; unseen: boolean; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-left">
      <div
        className="relative h-28 w-20 overflow-hidden rounded-[22px] bg-[#f2efe9] ring-2"
        style={{ "--tw-ring-color": unseen ? "#3b82f6" : "transparent" } as React.CSSProperties}
      >
        {story.media_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.media_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#fde2e4] to-[#e2ece9]">
            {story.type === "song" ? (
              <Music2 size={20} className="text-white/80" />
            ) : (
              <TypeIcon size={20} className="text-white/80" />
            )}
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-full ring-2 ring-white">
          <Avatar name={story.author.display_name} url={story.author.avatar_url} size={22} />
        </span>
      </div>
      <span className="max-w-[80px] truncate text-[11px] text-[#7c766c]">{story.author.display_name}</span>
    </button>
  );
}
