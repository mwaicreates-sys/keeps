"use client";

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

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useSession();
  const profileActive = pathname.startsWith("/profile");

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#f0ede6] bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex h-16 items-center justify-between px-3">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex flex-1 items-center justify-center">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-full px-3 py-1 transition-colors",
                  active && !primary && "bg-[#f2efe9]"
                )}
              >
                {primary ? (
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#3a362f] text-white">
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                ) : (
                  <Icon size={20} strokeWidth={active ? 2.3 : 2} className={active ? "text-[#3a362f]" : "text-[#716b5f]"} />
                )}
                <span
                  className={cn(
                    "text-[10px] leading-none",
                    active ? "font-semibold text-[#3a362f]" : "font-medium text-[#a39d92]"
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1 items-center justify-center">
          <Link
            href="/profile"
            aria-current={profileActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-full px-3 py-1 transition-colors",
              profileActive && "bg-[#f2efe9]"
            )}
          >
            <Avatar name={profile.display_name} url={profile.avatar_url} size={20} />
            <span
              className={cn(
                "text-[10px] leading-none",
                profileActive ? "font-semibold text-[#3a362f]" : "font-medium text-[#a39d92]"
              )}
            >
              Profile
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
