import Link from "next/link";
import { Sparkles, Search, Bell } from "lucide-react";

/**
 * Home's own header — small, centered, understated. Distinct from the
 * shared app TopBar used elsewhere; this is Home-specific chrome.
 */
export function HomeHeader({ unreadCount }: { unreadCount: number }) {
  return (
    <div className="relative flex h-12 items-center justify-center px-3">
      <Link
        href="/search"
        aria-label="Search"
        className="absolute left-1 grid h-9 w-9 place-items-center rounded-full text-[#3a362f]"
      >
        <Search size={18} strokeWidth={2} />
      </Link>
      <p className="flex items-center gap-1 text-[16px] font-bold tracking-tight text-[#3a362f]">
        <Sparkles size={13} className="text-[#c2ab5a]" />
        keeps
      </p>
      <Link
        href="/notifications"
        aria-label="Notifications"
        className="absolute right-1 grid h-9 w-9 place-items-center rounded-full text-[#3a362f]"
      >
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#ec4899] ring-2 ring-white" />
        )}
        <Bell size={18} strokeWidth={2} />
      </Link>
    </div>
  );
}
