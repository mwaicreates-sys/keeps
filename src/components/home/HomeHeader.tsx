import Link from "next/link";
import { Sparkles, Search, Bell } from "lucide-react";

/**
 * Home's own header — small, centered, understated. Distinct from the
 * shared app TopBar used elsewhere; this is Home-specific chrome.
 */
export function HomeHeader({ unreadCount }: { unreadCount: number }) {
  return (
    <div className="relative flex h-16 items-center justify-center px-3">
      <Link
        href="/search"
        aria-label="Search"
        className="absolute left-2 grid h-11 w-11 place-items-center rounded-full text-[#7c766c]"
      >
        <Search size={24} strokeWidth={1.8} />
      </Link>
      <p className="flex items-center gap-1.5 text-[21px] font-semibold tracking-tight text-[#3a362f]">
        <Sparkles size={16} className="text-[#b8b2a6]" />
        keeps
      </p>
      <Link
        href="/notifications"
        aria-label="Notifications"
        className="absolute right-2 grid h-11 w-11 place-items-center rounded-full text-[#7c766c]"
      >
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ec4899]" />
        )}
        <Bell size={24} strokeWidth={1.8} />
      </Link>
    </div>
  );
}
