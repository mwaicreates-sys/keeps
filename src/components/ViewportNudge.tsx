"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Mitigates a confirmed mobile-browser bug: after a client-side navigation
 * to a page short enough not to need scrolling, the layout viewport is
 * sometimes painted at a stale, narrower width until something forces a
 * genuine reflow. A synthetic `resize` event + forced getBoundingClientRect
 * read does NOT fix this (tested, still broke on every browser) — what
 * actually fixes it, confirmed by direct observation, is a real scroll:
 * on a live device, scrolling the page even slightly (which collapses the
 * address bar) immediately corrects the width, same as rotating the
 * device. This reproduces that exact nudge in software: a 1px scroll and
 * back, right after every navigation, so the user never has to do it by
 * hand.
 */
export function ViewportNudge() {
  const pathname = usePathname();

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      window.scrollTo(0, 1);
      window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
