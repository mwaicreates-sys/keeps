"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/utils";
import { markStoryViewed, saveStoryToMemories } from "@/services/stories-client";
import type { StoryWithAuthor } from "@/services/stories-server";

const DURATION_MS = 5000;
// A horizontal drag has to clear this before it counts as "go to the next
// person" rather than a tap-to-advance within the current person's stories.
const SWIPE_THRESHOLD_PX = 60;

/**
 * `groups` holds one array per person, each with only that person's own
 * stories (oldest first) -- stories are never combined across authors.
 * Tapping the left/right thirds of the screen steps within the current
 * person's stories (and auto-advance does the same); running out of
 * stories in either direction moves to the next/previous person. A
 * deliberate horizontal swipe jumps straight to the next/previous
 * person's story set instead.
 */
export function StoryViewer({
  groups,
  startGroupIndex,
  currentUserId,
  onClose,
}: {
  groups: StoryWithAuthor[][];
  startGroupIndex: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const [groupIndex, setGroupIndex] = useState(startGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const rafRef = useRef<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const stories = groups[groupIndex];
  const story = stories[storyIndex];

  useEffect(() => {
    setSaved(story.saved_to_memories);
    markStoryViewed(story.id, currentUserId).catch(() => {});
    const start = performance.now();
    setProgress(0);
    function tick(now: number) {
      const pct = Math.min(1, (now - start) / DURATION_MS);
      setProgress(pct);
      if (pct < 1) rafRef.current = requestAnimationFrame(tick);
      else nextStory();
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex]);

  /** Step within the current person's stories; falls through to the
   * next/previous person once their stories run out. */
  function nextStory() {
    if (storyIndex < stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }
  function prevStory() {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      setStoryIndex(groups[groupIndex - 1].length - 1);
    }
  }

  /** Explicit swipe: jump straight to the next/previous person, always
   * starting at their first story. */
  function nextPerson() {
    if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }
  function prevPerson() {
    if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      setStoryIndex(0);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) nextPerson();
      else prevPerson();
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95">
      <div className="relative flex h-dvh w-full max-w-md flex-col md:h-[92vh] md:rounded-3xl md:overflow-hidden">
        <div className="absolute inset-x-3 top-3 z-10 flex gap-1">
          {stories.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white transition-none"
                style={{ width: `${i < storyIndex ? 100 : i === storyIndex ? progress * 100 : 0}%` }}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-3 top-7 z-10 flex items-center gap-2.5">
          <Avatar name={story.author.display_name} url={story.author.avatar_url} size={40} />
          <p className="text-lg font-semibold text-white">{story.author.display_name}</p>
          <p className="text-sm text-white/70">{timeAgo(story.created_at)}</p>
          <button onClick={onClose} className="ml-auto rounded-full p-1.5 text-white/80 hover:bg-white/10">
            <X size={28} />
          </button>
        </div>

        <div
          className="relative flex flex-1 items-center justify-center bg-black"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {story.type === "photo" && story.media_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.media_url} alt="" className="max-h-full max-w-full object-contain" />
          )}
          {story.type === "video" && story.media_url && (
            <video src={story.media_url} autoPlay muted className="max-h-full max-w-full object-contain" />
          )}
          {story.type === "text" && (
            <p className="px-8 text-center font-display text-2xl text-white">{story.text_content}</p>
          )}
          {story.type === "song" && (
            <div className="flex flex-col items-center gap-4 px-8 text-center text-white">
              {story.song_artwork_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={story.song_artwork_url} alt="" className="h-40 w-40 rounded-2xl object-cover" />
              )}
              <p className="font-display text-xl">{story.song_title}</p>
              <p className="text-white/70">{story.song_artist}</p>
            </div>
          )}

          <button onClick={prevStory} aria-label="Previous" className="absolute inset-y-0 left-0 w-1/3" />
          <button onClick={nextStory} aria-label="Next" className="absolute inset-y-0 right-0 w-1/3" />
        </div>

        <div className="flex items-center justify-between gap-2 bg-black/80 px-4 py-3">
          <button
            onClick={() => prevStory()}
            className="grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={async () => {
              setSaved(true);
              await saveStoryToMemories(story.id, story.space_id, story.author_id).catch(() => {});
            }}
            disabled={saved}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            <Sparkles size={16} className={saved ? "text-gold" : undefined} />
            {saved ? "Saved to Memories" : "Save to Memories"}
          </button>
          <button
            onClick={() => nextStory()}
            className="grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
