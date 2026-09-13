"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Archive, Plus } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: typeof Home; primary?: boolean }[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/memories", label: "Memories", icon: Archive },
  { href: "/drop", label: "Drop", icon: Plus, primary: true },
];

/** Hides the nav while the page is actively scrolling, brings it back
 * once scrolling has stopped for a beat — same behavior as the
 * reference toolbar. */
function useHideOnScroll() {
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onScroll() {
      setVisible(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setVisible(true), 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return visible;
}

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useSession();
  const profileActive = pathname.startsWith("/profile");
  const visible = useHideOnScroll();

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 transition-all duration-300 md:hidden",
        visible ? "translate-y-0 opacity-100" : "translate-y-[calc(100%+24px)] opacity-0"
      )}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
    >
      <nav
        aria-label="Primary"
        className="flex h-14 items-stretch gap-1 rounded-full bg-white p-1 shadow-[0_6px_24px_-6px_rgba(20,18,15,0.25)] ring-1 ring-black/[0.04]"
      >
        <ul className="flex items-stretch gap-1">
          {items.map(({ href, label, icon: Icon, primary }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href} className="flex">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 rounded-full px-3 transition-colors",
                    active && !primary && "bg-[#f2efe9]"
                  )}
                >
                  {primary ? (
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#3a362f] text-white">
                      <Icon size={18} strokeWidth={2.2} />
                    </span>
                  ) : (
                    <Icon size={18} strokeWidth={active ? 2.3 : 2} className={active ? "text-[#3a362f]" : "text-[#716b5f]"} />
                  )}
                  <span
                    className={cn(
                      "text-[9.5px] leading-none",
                      active ? "font-semibold text-[#3a362f]" : "font-medium text-[#a39d92]"
                    )}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="flex">
            <Link
              href="/profile"
              aria-current={profileActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-full px-3 transition-colors",
                profileActive && "bg-[#f2efe9]"
              )}
            >
              <Avatar name={profile.display_name} url={profile.avatar_url} size={18} />
              <span
                className={cn(
                  "text-[9.5px] leading-none",
                  profileActive ? "font-semibold text-[#3a362f]" : "font-medium text-[#a39d92]"
                )}
              >
                Profile
              </span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
