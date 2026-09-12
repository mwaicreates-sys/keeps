"use client";

import { useState } from "react";
import { Heart, MessageCircle, SmilePlus, Bookmark, Sparkles } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";
import { toggleReaction, toggleSaved, toggleMemory } from "@/services/posts-client";
import { useSession } from "@/components/SessionProvider";
import type { Tables } from "@/lib/types";

const EXTRA_EMOJIS = ["😂", "🔥", "😭", "⭐"] as const;

export function PostActions({
  postId,
  postAuthorId,
  reactions,
  saved,
  isMemory,
  onToggleComments,
}: {
  postId: string;
  postAuthorId: string;
  reactions: Tables<"reactions">[];
  saved: boolean;
  isMemory: boolean;
  onToggleComments: () => void;
}) {
  const { userId, space, otherMember, members } = useSession();
  const [localReactions, setLocalReactions] = useState(reactions);
  const [localSaved, setLocalSaved] = useState(saved);
  const [localMemory, setLocalMemory] = useState(isMemory);
  const [showMore, setShowMore] = useState(false);

  const mine = new Set(localReactions.filter((r) => r.user_id === userId).map((r) => r.emoji));
  const liked = mine.has("❤️");
  const reactorIds = Array.from(new Set(localReactions.map((r) => r.user_id)));

  function react(emoji: string) {
    const already = mine.has(emoji);
    setLocalReactions((prev) =>
      already
        ? prev.filter((r) => !(r.user_id === userId && r.emoji === emoji))
        : [...prev, { id: `optimistic-${emoji}`, post_id: postId, user_id: userId, emoji, created_at: new Date().toISOString() }]
    );
    toggleReaction(postId, userId, emoji, space.id, otherMember?.id ?? null, postAuthorId).catch(() => {});
  }

  return (
    <div className="px-1 pt-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => react("❤️")}
            aria-pressed={liked}
            aria-label="Like"
            className="grid h-12 w-12 place-items-center rounded-full transition active:scale-90"
          >
            <Heart size={27} strokeWidth={2} className={liked ? "text-[#ec4899]" : "text-[#3a362f]"} fill={liked ? "#ec4899" : "none"} />
          </button>
          <button onClick={onToggleComments} aria-label="Replies" className="grid h-12 w-12 place-items-center rounded-full">
            <MessageCircle size={25} strokeWidth={2} className="text-[#3a362f]" />
          </button>
          <button
            onClick={() => setShowMore((s) => !s)}
            aria-label="More reactions"
            aria-expanded={showMore}
            className="grid h-12 w-12 place-items-center rounded-full"
          >
            <SmilePlus size={25} strokeWidth={2} className="text-[#3a362f]" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {reactorIds.length > 0 && (
            <div className="flex items-center -space-x-2">
              {reactorIds.map((id) => {
                const m = members.find((mm) => mm.id === id);
                if (!m) return null;
                return (
                  <span key={id} className="rounded-full ring-2 ring-white">
                    <Avatar name={m.display_name} url={m.avatar_url} size={24} />
                  </span>
                );
              })}
            </div>
          )}
          <button
            onClick={() => {
              setLocalSaved((s) => !s);
              toggleSaved(postId, userId, space.id).catch(() => {});
            }}
            aria-pressed={localSaved}
            aria-label="Save"
            className="grid h-11 w-11 place-items-center rounded-full"
          >
            <Bookmark size={21} strokeWidth={2} className={cn("text-[#a39d92]", localSaved && "text-[#3a362f]")} fill={localSaved ? "#3a362f" : "none"} />
          </button>
          <button
            onClick={() => {
              setLocalMemory((m) => !m);
              toggleMemory(postId, localMemory).catch(() => {});
            }}
            aria-pressed={localMemory}
            aria-label="Keep as memory"
            className="grid h-11 w-11 place-items-center rounded-full"
          >
            <Sparkles size={21} strokeWidth={2} className={cn("text-[#a39d92]", localMemory && "text-[#d4a72c]")} fill={localMemory ? "#d4a72c" : "none"} />
          </button>
        </div>
      </div>

      {showMore && (
        <div className="mt-2 flex gap-1.5">
          {EXTRA_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => react(emoji)}
              aria-pressed={mine.has(emoji)}
              className={cn(
                "flex h-8 items-center gap-1 rounded-full border px-2.5 text-sm transition",
                mine.has(emoji) ? "border-[#3a362f]/20 bg-[#f2efe9]" : "border-transparent"
              )}
            >
              {emoji}
              {localReactions.filter((r) => r.emoji === emoji).length > 0 && (
                <span className="text-xs text-[#a39d92]">{localReactions.filter((r) => r.emoji === emoji).length}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
