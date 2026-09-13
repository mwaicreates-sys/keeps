"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const WORDS = [
  "Loading",
  "Gathering memories",
  "Just a moment",
  "Almost there",
  "Getting things ready",
  "One sec",
  "Fetching",
];

/** Picks a random word index, never the same one twice in a row. */
function randomWordIndex(exclude: number) {
  if (WORDS.length === 1) return 0;
  let next = Math.floor(Math.random() * WORDS.length);
  while (next === exclude) next = Math.floor(Math.random() * WORDS.length);
  return next;
}

/**
 * Shown only for the moment a route inside the authenticated shell is
 * still fetching its data — the header/nav shell (from layout.tsx)
 * stays mounted the whole time, only this content slot swaps in. Fixed
 * over the whole viewport so the sparkle mark sits dead-center on the
 * screen (not just centered within whatever content-area height is left
 * under the header/nav), with a word cycling in random order underneath
 * (same idea as Claude's own "thinking" label) so a longer wait doesn't
 * feel frozen.
 */
export default function AppLoading() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => randomWordIndex(i));
    }, 1100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-10 flex flex-col items-center justify-center gap-3" aria-hidden>
      <Sparkles size={28} className="animate-pulse text-[#c2ab5a] motion-reduce:animate-none" strokeWidth={1.8} />
      <p key={wordIndex} className="animate-fade-in text-[13px] font-medium text-[#a39d92]">
        {WORDS[wordIndex]}…
      </p>
    </div>
  );
}
