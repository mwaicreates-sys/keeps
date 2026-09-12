"use client";

import { usePathname } from "next/navigation";

/**
 * Home, Memories, and Drop each render their own HomeHeader instance
 * (matching Home's chrome exactly is the whole point of redesigning these
 * pages) — the shared mobile TopBar would duplicate it, so it's suppressed
 * on those routes only.
 */
const HOME_HEADER_ROUTES = new Set(["/memories", "/drop", "/play", "/profile", "/notifications", "/search"]);

export function HideOnHome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/home") || HOME_HEADER_ROUTES.has(pathname)) return null;
  return <>{children}</>;
}
