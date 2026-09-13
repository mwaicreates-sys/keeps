"use client";

import { usePathname } from "next/navigation";
import { usesHomeLightTheme } from "@/lib/theme-routes";

/**
 * Home, Memories, Drop, Play, Profile, Notifications, and Search each
 * render their own HomeHeader instance — the shared mobile TopBar would
 * duplicate it, so it's suppressed on those routes (the same set that
 * uses the light theme; see theme-routes.ts).
 */
export function HideOnHome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (usesHomeLightTheme(pathname)) return null;
  return <>{children}</>;
}
