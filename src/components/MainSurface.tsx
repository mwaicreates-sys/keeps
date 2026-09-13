"use client";

import { usePathname } from "next/navigation";
import { usesHomeLightTheme, HOME_LIGHT_THEME } from "@/lib/theme-routes";

export function MainSurface({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLight = usesHomeLightTheme(pathname);

  return (
    <main className="min-h-dvh flex-1 bg-paper pb-24 md:pb-10" style={isLight ? HOME_LIGHT_THEME : undefined}>
      {children}
    </main>
  );
}
