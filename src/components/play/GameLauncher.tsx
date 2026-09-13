"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { RotateCcw } from "lucide-react";

/**
 * The shared "starting a game" screen -- shown for the instant between
 * tapping a game card and landing in gameplay. Per the navigation
 * rewrite: tapping a game card must never show a history list first;
 * this is what fills that (usually brief, often near-instant thanks to
 * prefetching) gap instead.
 */
export function GameLauncher({
  label,
  icon: Icon,
  bg,
  iconColor,
  start,
}: {
  label: string;
  icon: LucideIcon;
  bg: string;
  iconColor: string;
  /** Starts (or resumes) the round and navigates there. Thrown errors
   * are caught and shown with a retry button -- the player is never
   * left on a silent blank screen if the round fails to generate. */
  start: () => Promise<void>;
}) {
  const [failed, setFailed] = useState(false);
  const startingRef = useRef(false);

  async function run() {
    if (startingRef.current) return;
    startingRef.current = true;
    setFailed(false);
    try {
      await start();
    } catch {
      setFailed(true);
    } finally {
      startingRef.current = false;
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: bg, color: iconColor }}>
        <Icon size={26} className={failed ? "" : "animate-pulse"} />
      </div>
      {failed ? (
        <>
          <p className="text-[15px] font-semibold text-[#3a362f]">Couldn&apos;t start {label}</p>
          <p className="mt-1 text-[13px] text-[#a39d92]">Check your connection and try again.</p>
          <button
            type="button"
            onClick={run}
            className="mt-5 flex items-center gap-1.5 rounded-full bg-[#3a362f] px-5 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98]"
          >
            <RotateCcw size={15} /> Try again
          </button>
        </>
      ) : (
        <p className="text-[14.5px] font-medium text-[#a39d92]">Starting {label}…</p>
      )}
    </div>
  );
}
