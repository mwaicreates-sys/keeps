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

/**
 * Shown only for the moment a route inside the authenticated shell is
 * still fetching its data — the header/nav shell (from layout.tsx)
 * stays mounted the whole time, only this content slot swaps in. Same
 * sparkle mark as the splash screen and every page header, centered in
 * the content area, with a small cycling word underneath (same idea as
 * Claude's own "thinking" label) so a longer wait doesn't feel frozen.
 */
export default function AppLoading() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % WORDS.length);
    }, 1100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto flex min-h-[65vh] w-full max-w-xl flex-col items-center justify-center gap-3" aria-hidden>
      <Sparkles size={28} className="animate-pulse text-[#c2ab5a] motion-reduce:animate-none" strokeWidth={1.8} />
      <p key={wordIndex} className="animate-fade-in text-[13px] font-medium text-[#a39d92]">
        {WORDS[wordIndex]}…
      </p>
    </div>
  );
}
