"use client";

import { usePathname } from "next/navigation";

/**
 * Home has its own header (HomeHeader) — the shared mobile TopBar would
 * duplicate it, so it's suppressed on that one route only.
 */
export function HideOnHome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/home")) return null;
  return <>{children}</>;
}
