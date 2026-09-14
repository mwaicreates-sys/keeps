import Link from "next/link";
import { AlertTriangle, type LucideIcon } from "lucide-react";

/**
 * Shown when opening a game's daily run throws (a transient provider
 * hiccup, a database error, anything unexpected) instead of resolving
 * to a real run or a clean "not available" result. Per the entry-flow
 * rule: a card must never lead to a dead end -- tapping it always
 * opens the route, and if that route's own data fetch fails outright,
 * the route still renders *something* actionable (this) rather than a
 * blank/generic crash screen. The route itself already opened (the
 * URL changed); this is what fills that screen.
 */
export function GameEntryError({
  icon: Icon,
  bg,
  iconColor,
  label,
  retryHref,
}: {
  icon: LucideIcon;
  bg: string;
  iconColor: string;
  label: string;
  retryHref: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: bg, color: iconColor }}>
        <Icon size={26} />
      </div>
      <p className="flex items-center gap-1.5 text-[15px] font-semibold text-[#3a362f]">
        <AlertTriangle size={16} /> Couldn&apos;t open {label}
      </p>
      <p className="mt-1.5 max-w-[26ch] text-[13.5px] text-[#a39d92]">Something went wrong loading today&apos;s round. Try again.</p>
      <Link
        href={retryHref}
        className="mt-6 rounded-full bg-[#3a362f] px-5 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98]"
      >
        Try again
      </Link>
    </div>
  );
}
