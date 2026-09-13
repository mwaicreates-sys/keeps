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
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className="grid place-items-center"
                style={{ height: 44, width: 44 }}
              >
                {primary ? (
                  <span className="grid place-items-center rounded-full bg-[#3a362f] text-white" style={{ height: 46, width: 46 }}>
                    <Icon size={22} strokeWidth={2.2} />
                  </span>
                ) : (
                  <Icon size={23} strokeWidth={active ? 2.3 : 2} className={active ? "text-[#3a362f]" : "text-[#716b5f]"} />
                )}
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1 items-center justify-center">
          <Link
            href="/profile"
            aria-current={profileActive ? "page" : undefined}
            className="grid place-items-center"
            style={{ height: 44, width: 44 }}
          >
            <span className={cn("rounded-full p-0.5", profileActive && "ring-2 ring-[#3a362f]")}>
              <Avatar name={profile.display_name} url={profile.avatar_url} size={36} />
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
