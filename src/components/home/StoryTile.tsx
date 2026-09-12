import { Plus, Music2, Type as TypeIcon } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { StoryWithAuthor } from "@/services/stories-server";
import type { Tables } from "@/lib/types";

/** The "Add story" tile — always first in the rail. */
export function AddStoryTile({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <div className="flex w-[116px] shrink-0 flex-col items-center gap-2">
      <div className="relative h-[156px] w-[116px] overflow-hidden rounded-[28px] bg-[#f2efe9]">
        <div className="grid h-full w-full place-items-center">
          <Avatar name={name} url={avatarUrl} size={58} />
        </div>
        <span className="absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full bg-[#3b82f6] text-white ring-2 ring-white">
          <Plus size={20} strokeWidth={2.5} />
        </span>
      </div>
      <span className="text-[15px] font-medium text-[#7c766c]">Add story</span>
    </div>
  );
}

/** One rounded-rectangle, portrait story tile with an overlapping avatar. */
export function StoryTile({ story, unseen, onOpen }: { story: StoryWithAuthor; unseen: boolean; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="flex w-[116px] shrink-0 flex-col items-center gap-2 text-left">
      <div
        className="relative h-[156px] w-[116px] overflow-hidden rounded-[28px] bg-[#f2efe9] ring-[3px]"
        style={{ "--tw-ring-color": unseen ? "#3b82f6" : "transparent" } as React.CSSProperties}
      >
        {story.media_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.media_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#fde2e4] to-[#e2ece9]">
            {story.type === "song" ? (
              <Music2 size={24} className="text-white/80" />
            ) : (
              <TypeIcon size={24} className="text-white/80" />
            )}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full ring-[3px] ring-white">
          <Avatar name={story.author.display_name} url={story.author.avatar_url} size={40} />
        </span>
      </div>
      <span className="max-w-[116px] truncate text-[15px] font-medium text-[#3a362f]">{story.author.display_name}</span>
    </button>
  );
}

/**
 * A member with no active story right now still gets a tile — the reference
 * keeps the row balanced (Gerry / Cuz always present) rather than shrinking
 * to only whoever happens to have posted a story.
 */
export function StoryPlaceholderTile({ member }: { member: Tables<"profiles"> }) {
  return (
    <div className="flex w-[116px] shrink-0 flex-col items-center gap-2">
      <div className="grid h-[156px] w-[116px] place-items-center rounded-[28px] bg-[#f2efe9]">
        <Avatar name={member.display_name} url={member.avatar_url} size={58} />
      </div>
      <span className="max-w-[116px] truncate text-[15px] font-medium text-[#a39d92]">{member.display_name}</span>
    </div>
  );
}
