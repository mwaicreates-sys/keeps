"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Mitigates a known Chrome-mobile bug (not something in our CSS — confirmed
 * by rotating the device fixing it instantly): after a client-side
 * navigation to a page short enough not to need scrolling, Chrome
 * sometimes fails to repaint the full viewport width until something
 * forces a genuine layout recalculation. Rotating the device does that;
 * this does the same thing in software right after every navigation, so
 * the user never has to.
 */
export function ViewportNudge() {
  const pathname = usePathname();

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
      // Reading layout metrics forces a synchronous reflow — a standard,
      // side-effect-free way to make the engine recompute geometry now
      // rather than trusting whatever it painted on first load.
      void document.documentElement.getBoundingClientRect();
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
