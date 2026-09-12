import Link from "next/link";
import { Sparkles, Search, Bell } from "lucide-react";

/**
 * Home's own header — small, centered, understated. Distinct from the
 * shared app TopBar used elsewhere; this is Home-specific chrome.
 */
export function HomeHeader({ unreadCount }: { unreadCount: number }) {
  return (
    <div className="relative flex items-center justify-center px-4 pb-3 pt-2">
      <Link href="/search" aria-label="Search" className="absolute left-4 rounded-full p-1.5 text-[#9a958c]">
        <Search size={18} strokeWidth={1.8} />
      </Link>
      <p className="flex items-center gap-1.5 text-[15px] font-medium tracking-tight text-[#3a362f]">
        <Sparkles size={14} className="text-[#b8b2a6]" />
        keeps
      </p>
      <Link href="/notifications" aria-label="Notifications" className="absolute right-4 rounded-full p-1.5 text-[#9a958c]">
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[#ec4899]" />
        )}
        <Bell size={18} strokeWidth={1.8} />
      </Link>
    </div>
  );
}
