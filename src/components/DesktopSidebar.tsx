"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Archive, PlusCircle, Gamepad2, CircleUserRound, LogOut } from "lucide-react";
import { signOut } from "@/services/auth-client";
import { useRouter } from "next/navigation";

const items = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/memories", label: "Memories", icon: Archive },
  { href: "/drop", label: "Drop", icon: PlusCircle },
  { href: "/play", label: "Games", icon: Gamepad2 },
  { href: "/profile", label: "Profile", icon: CircleUserRound },
] as const;

export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col justify-between border-r border-line px-4 py-8 md:flex">
      <div>
        <p className="font-display px-2 text-2xl italic text-ink">keeps</p>
        <nav className="mt-10 space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-full px-3 py-2.5 text-[15px] transition ${
                  active ? "bg-ink text-paper" : "text-ink hover:bg-accent-soft"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <button
        onClick={async () => {
          await signOut();
          router.replace("/login");
        }}
        className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-ink-soft hover:text-ink"
      >
        <LogOut size={16} /> Sign out
      </button>
    </aside>
  );
}
