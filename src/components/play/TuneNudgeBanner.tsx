"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Music2, X } from "lucide-react";

/** The gentle, one-time-per-dismissal nudge for users who skipped
 * "Tune your Play" -- never a blocking modal, never repeated once
 * dismissed. Per the spec: "Do not nag." */
export function TuneNudgeBanner({ hasProfile }: { hasProfile: boolean }) {
  const [dismissed, setDismissed] = useState(true); // default hidden until the localStorage check resolves, to avoid a flash

  useEffect(() => {
    if (hasProfile) return;
    try {
      setDismissed(localStorage.getItem("keeps-tune-play-skipped") === "1");
    } catch {
      setDismissed(false);
    }
  }, [hasProfile]);

  if (hasProfile || dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem("keeps-tune-play-skipped", "1");
    } catch {
      // best-effort only
    }
    setDismissed(true);
  }

  return (
    <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl bg-[#f2efe9] px-4 py-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#3a362f]">
        <Music2 size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#3a362f]">Want better Play picks?</p>
        <p className="text-[12px] text-[#a39d92]">Pick a few artists you like.</p>
      </div>
      <Link
        href="/play/tune"
        className="shrink-0 rounded-full bg-[#3a362f] px-3.5 py-2 text-[12.5px] font-semibold text-white"
      >
        Tune it
      </Link>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-[#a39d92]">
        <X size={16} />
      </button>
    </div>
  );
}
