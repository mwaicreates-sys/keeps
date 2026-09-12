"use client";

import { usePathname } from "next/navigation";

// Home's light theme, applied here (not just inside the Home page) so the
// entire scrollable surface — including the bottom-nav clearance padding —
// is the same light color, with no dark strip bleeding through underneath.
const HOME_LIGHT_THEME = {
  "--paper": "#faf9f6",
  "--paper-raised": "#ffffff",
  "--ink": "#3a362f",
  "--ink-soft": "#a39d92",
  "--line": "#eee9e2",
} as React.CSSProperties;

export function MainSurface({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const usesHomeTheme =
    pathname.startsWith("/home") ||
    pathname === "/memories" ||
    pathname === "/drop" ||
    pathname === "/play" ||
    pathname === "/profile" ||
    pathname === "/notifications" ||
    pathname === "/search";

  return (
    <main className="min-h-full flex-1 bg-paper pb-24 md:pb-10" style={usesHomeTheme ? HOME_LIGHT_THEME : undefined}>
      {children}
    </main>
  );
}
