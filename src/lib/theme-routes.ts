/**
 * The single source of truth for which routes use Home's light theme
 * (vs. the device-default dark theme). Used by both the outermost shell
 * background and <main>'s own background — previously the light override
 * was applied ONLY on <main>, while its ancestors (the shell div in
 * AppLayout) kept the plain `bg-paper` class, which resolves to the dark
 * palette on a device in dark mode. Normally invisible, because <main>'s
 * content is always taller than the viewport — but on a short page (Play,
 * with only a few cards and no long feed), <main> can end before the
 * viewport does, and the dark shell background shows through the gap.
 * Applying the same override at the shell level removes that possibility
 * regardless of any content-height edge case.
 */
export function usesHomeLightTheme(pathname: string): boolean {
  return (
    pathname.startsWith("/home") ||
    pathname === "/memories" ||
    pathname.startsWith("/memories/") ||
    pathname.startsWith("/collections/") ||
    pathname === "/drop" ||
    pathname === "/play" ||
    pathname === "/profile" ||
    pathname === "/notifications" ||
    pathname === "/search"
  );
}

export const HOME_LIGHT_THEME = {
  "--paper": "#faf9f6",
  "--paper-raised": "#ffffff",
  "--ink": "#3a362f",
  "--ink-soft": "#a39d92",
  "--line": "#eee9e2",
} as React.CSSProperties;
