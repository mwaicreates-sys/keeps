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
      // Force the browser to re-parse the viewport meta tag and drop any
      // stuck pinch-zoom/visual-viewport scale it's carrying over from the
      // previous route — mutating the attribute (not just re-reading it)
      // is what actually triggers mobile browsers to recompute this.
      const meta = document.querySelector('meta[name="viewport"]');
      if (meta) {
        const original = meta.getAttribute("content") ?? "";
        meta.setAttribute("content", original + ", user-scalable=yes");
        requestAnimationFrame(() => meta.setAttribute("content", original));
      }
      window.scrollTo(0, 1);
      window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
