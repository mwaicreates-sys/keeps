import Link from "next/link";
import { Search, Bell } from "lucide-react";

/**
 * unreadCount is passed in from the shared session context (computed
 * once per request) instead of this component querying it itself —
 * this used to run its own notifications count query on every request
 * even though HideOnHome hides it on every current route.
 */
export function TopBar({ unreadCount }: { unreadCount: number }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur md:hidden">
      <p className="font-display text-xl italic text-ink">keeps</p>
      <div className="flex items-center gap-1">
        <Link href="/search" aria-label="Search" className="rounded-full p-2 text-ink hover:bg-accent-soft">
          <Search size={20} strokeWidth={1.8} />
        </Link>
        <Link href="/notifications" aria-label="Notifications" className="relative rounded-full p-2 text-ink hover:bg-accent-soft">
          <Bell size={20} strokeWidth={1.8} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
