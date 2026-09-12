"use client";

import { usePathname } from "next/navigation";

/**
 * Home and Memories both render their own HomeHeader instance (matching
 * Home's chrome exactly is the whole point of the Memories redesign) — the
 * shared mobile TopBar would duplicate it, so it's suppressed on those
 * routes only.
 */
export function HideOnHome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/home") || pathname === "/memories") return null;
  return <>{children}</>;
}
