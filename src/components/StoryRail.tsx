"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { StoryViewer } from "@/components/StoryViewer";
import { cn } from "@/lib/utils";
import type { StoryWithAuthor } from "@/services/stories-server";
import { Plus } from "lucide-react";
import Link from "next/link";

export function StoryRail({ stories, currentUserId }: { stories: StoryWithAuthor[]; currentUserId: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const byAuthor = new Map<string, StoryWithAuthor[]>();
  for (const s of stories) {
    const list = byAuthor.get(s.author_id) ?? [];
    list.push(s);
    byAuthor.set(s.author_id, list);
  }
  const groups = Array.from(byAuthor.values());

  return (
    <>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 py-4">
        <Link href="/drop?story=1" className="flex flex-col items-center gap-1.5">
          <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-line text-ink-soft">
            <Plus size={22} />
          </div>
          <span className="text-xs text-ink-soft">Add</span>
        </Link>
        {groups.map((group) => {
          const unseen = group.some((s) => !s.viewed && s.author_id !== currentUserId);
          const author = group[0].author;
          return (
            <button
              key={author.id}
              onClick={() => setOpenIndex(stories.indexOf(group[0]))}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={cn(
                  "rounded-full p-[2px]",
                  unseen ? "bg-gradient-to-tr from-accent to-gold" : "bg-line"
                )}
              >
                <div className="rounded-full bg-paper p-[2px]">
                  <Avatar name={author.display_name} url={author.avatar_url} size={60} />
                </div>
              </div>
              <span className="max-w-[64px] truncate text-xs text-ink-soft">
                {author.id === currentUserId ? "You" : author.display_name}
              </span>
            </button>
          );
        })}
      </div>
      {openIndex !== null && (
        <StoryViewer
          stories={stories}
          startIndex={openIndex}
          currentUserId={currentUserId}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
