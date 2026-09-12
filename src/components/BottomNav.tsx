"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Archive, PlusCircle, Gamepad2 } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: typeof Home; primary?: boolean }[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/memories", label: "Memories", icon: Archive },
  { href: "/drop", label: "Drop", icon: PlusCircle, primary: true },
  { href: "/play", label: "Play", icon: Gamepad2 },
];

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useSession();
  const profileActive = pathname.startsWith("/profile");

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper-raised/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-between px-2">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition ${
                  active ? "text-accent" : "text-ink-soft"
                }`}
              >
                <Icon
                  size={primary ? 30 : 24}
                  strokeWidth={active ? 2.4 : 1.8}
                  className={primary ? "text-accent" : undefined}
                  fill={primary ? "var(--accent-soft)" : "none"}
                />
                {!primary && <span>{label}</span>}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <Link
            href="/profile"
            aria-current={profileActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] transition",
              profileActive ? "text-accent" : "text-ink-soft"
            )}
          >
            <span className={cn("rounded-full p-0.5", profileActive && "ring-2 ring-accent")}>
              <Avatar name={profile.display_name} url={profile.avatar_url} size={24} />
            </span>
            <span>Profile</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
