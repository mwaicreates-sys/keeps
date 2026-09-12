"use client";

import { useState } from "react";
import { StoryViewer } from "@/components/StoryViewer";
import { AddStoryTile, StoryTile } from "@/components/home/StoryTile";
import type { StoryWithAuthor } from "@/services/stories-server";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";

export function StoryRail({ stories, currentUserId }: { stories: StoryWithAuthor[]; currentUserId: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { profile } = useSession();

  const byAuthor = new Map<string, StoryWithAuthor[]>();
  for (const s of stories) {
    const list = byAuthor.get(s.author_id) ?? [];
    list.push(s);
    byAuthor.set(s.author_id, list);
  }
  const groups = Array.from(byAuthor.values());

  return (
    <>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 py-3">
        <Link href="/drop?story=1">
          <AddStoryTile name={profile.display_name} avatarUrl={profile.avatar_url} />
        </Link>
        {groups.map((group) => {
          const unseen = group.some((s) => !s.viewed && s.author_id !== currentUserId);
          return (
            <StoryTile
              key={group[0].author_id}
              story={group[0]}
              unseen={unseen}
              onOpen={() => setOpenIndex(stories.indexOf(group[0]))}
            />
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
