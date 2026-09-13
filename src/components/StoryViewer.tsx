"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/utils";
import { markStoryViewed, saveStoryToMemories } from "@/services/stories-client";
import type { StoryWithAuthor } from "@/services/stories-server";

const DURATION_MS = 5000;

export function StoryViewer({
  stories,
  startIndex,
  currentUserId,
  onClose,
}: {
  stories: StoryWithAuthor[];
  startIndex: number;
  currentUserId: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const story = stories[index];
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setSaved(story.saved_to_memories);
    markStoryViewed(story.id, currentUserId).catch(() => {});
    const start = performance.now();
    setProgress(0);
    function tick(now: number) {
      const pct = Math.min(1, (now - start) / DURATION_MS);
      setProgress(pct);
      if (pct < 1) rafRef.current = requestAnimationFrame(tick);
      else next();
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function next() {
    if (index < stories.length - 1) setIndex(index + 1);
    else onClose();
  }
  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95">
      <div className="relative flex h-dvh w-full max-w-md flex-col md:h-[92vh] md:rounded-3xl md:overflow-hidden">
        <div className="absolute inset-x-3 top-3 z-10 flex gap-1">
          {stories.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white transition-none"
                style={{ width: `${i < index ? 100 : i === index ? progress * 100 : 0}%` }}
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

        <div className="relative flex flex-1 items-center justify-center bg-black">
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

          <button onClick={prev} aria-label="Previous" className="absolute inset-y-0 left-0 w-1/3" />
          <button onClick={next} aria-label="Next" className="absolute inset-y-0 right-0 w-1/3" />
        </div>

        <div className="flex items-center justify-between gap-2 bg-black/80 px-4 py-3">
          <button
            onClick={() => prev()}
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
            onClick={() => next()}
            className="grid h-9 w-9 place-items-center rounded-full text-white/80 hover:bg-white/10"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
