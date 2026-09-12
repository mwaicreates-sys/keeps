"use client";

import { useState } from "react";
import { StoryViewer } from "@/components/StoryViewer";
import { AddStoryTile, StoryTile, StoryPlaceholderTile } from "@/components/home/StoryTile";
import type { StoryWithAuthor } from "@/services/stories-server";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";

export function StoryRail({ stories, currentUserId }: { stories: StoryWithAuthor[]; currentUserId: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { profile, members } = useSession();

  const latestByAuthor = new Map<string, StoryWithAuthor>();
  for (const s of stories) {
    if (!latestByAuthor.has(s.author_id)) latestByAuthor.set(s.author_id, s);
  }
  const hasUnseen = (authorId: string) =>
    stories.some((s) => s.author_id === authorId && !s.viewed && authorId !== currentUserId);

  return (
    <>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 py-3">
        <Link href="/drop?story=1">
          <AddStoryTile name={profile.display_name} avatarUrl={profile.avatar_url} />
        </Link>
        {/* Both members always get a tile — the row stays balanced whether
            or not they currently have an active story. */}
        {members.map((member) => {
          const story = latestByAuthor.get(member.id);
          if (!story) return <StoryPlaceholderTile key={member.id} member={member} />;
          return (
            <StoryTile
              key={member.id}
              story={story}
              unseen={hasUnseen(member.id)}
              onOpen={() => setOpenIndex(stories.indexOf(story))}
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
