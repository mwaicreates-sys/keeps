"use client";

import { usePathname } from "next/navigation";
import { usesHomeLightTheme, HOME_LIGHT_THEME } from "@/lib/theme-routes";

/**
 * Wraps AppLayout's outermost div — see theme-routes.ts for why this
 * needs to happen here and not only on <main>.
 */
export function AppThemeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLight = usesHomeLightTheme(pathname);

  return (
    <div className="flex min-h-[100vh] bg-paper" style={isLight ? HOME_LIGHT_THEME : undefined}>
      {children}
    </div>
  );
}
