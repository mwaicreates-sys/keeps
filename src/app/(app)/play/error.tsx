"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Segment-level safety net for every /play/* route (hub, each game,
 * history, tune, match predictions). Per the entry-flow rule, a game
 * card must never lead to a dead end: each game page already catches
 * its own data-fetch failure and renders GameEntryError inline (see
 * e.g. play/this-or-that/page.tsx), but this is the backstop for
 * anything that still throws somewhere else in the tree -- without
 * it, an uncaught error here would fall through to Next's generic,
 * unbranded crash screen instead of a real "try again" state.
 */
export default function PlayError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[play] segment error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#f7f5f1] text-[#3a362f]">
        <AlertTriangle size={26} />
      </div>
      <p className="text-[15px] font-semibold text-[#3a362f]">Something went wrong</p>
      <p className="mt-1.5 max-w-[26ch] text-[13.5px] text-[#a39d92]">This didn&apos;t load right. Try again, or head back to Play.</p>
      <div className="mt-6 flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 rounded-full bg-[#3a362f] px-5 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98]"
        >
          <RotateCcw size={15} /> Try again
        </button>
        <Link
          href="/play"
          className="rounded-full bg-[#f7f5f1] px-5 py-3 text-[14px] font-semibold text-[#3a362f] transition active:scale-[0.98]"
        >
          Back to Play
        </Link>
      </div>
    </div>
  );
}
