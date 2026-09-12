"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Archive, Plus, Gamepad2 } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: typeof Home; primary?: boolean }[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/memories", label: "Memories", icon: Archive },
  { href: "/drop", label: "Drop", icon: Plus, primary: true },
  { href: "/play", label: "Play", icon: Gamepad2 },
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
      <ul className="flex h-[72px] items-center justify-between px-3">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex flex-1 items-center justify-center">
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className="grid h-11 w-11 place-items-center"
              >
                {primary ? (
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-[#3a362f] text-white">
                    <Icon size={24} strokeWidth={2.2} />
                  </span>
                ) : (
                  <Icon size={24} strokeWidth={active ? 2.2 : 1.6} className={active ? "text-[#3a362f]" : "text-[#b8b2a6]"} />
                )}
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1 items-center justify-center">
          <Link href="/profile" aria-current={profileActive ? "page" : undefined} className="grid h-11 w-11 place-items-center">
            <span className={cn("rounded-full p-0.5", profileActive && "ring-2 ring-[#3a362f]")}>
              <Avatar name={profile.display_name} url={profile.avatar_url} size={38} />
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
