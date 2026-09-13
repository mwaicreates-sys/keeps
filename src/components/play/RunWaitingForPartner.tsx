import Link from "next/link";
import { Sparkle, type LucideIcon } from "lucide-react";

/**
 * Shown the moment a player finishes today's run before their partner
 * has -- per the product decision, this is NOT a blocking wait screen
 * (no polling, no spinner): it just says results are pending and sends
 * the player back to Play. When the partner later finishes, a
 * notification (created server-side in /api/play/run/answer) deep-
 * links straight back here, and by then both are complete so the
 * result renders instead of this screen.
 */
export function RunWaitingForPartner({
  icon: Icon,
  bg,
  iconColor,
  headline,
  partnerName,
}: {
  icon: LucideIcon;
  bg: string;
  iconColor: string;
  /** e.g. "That's today's 5" (This or That) or "Locked in" (a single-action game). */
  headline: string;
  partnerName: string | null;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: bg, color: iconColor }}>
        <Icon size={26} />
      </div>
      <p className="flex items-center gap-1.5 text-[16px] font-bold text-[#3a362f]">
        {headline} <Sparkle size={15} className="fill-current" style={{ color: iconColor }} />
      </p>
      <p className="mt-1.5 text-[13.5px] text-[#a39d92]">
        Results when {partnerName ?? "your partner"} finishes.
      </p>
      <Link
        href="/play"
        className="mt-6 rounded-full bg-[#3a362f] px-5 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98]"
      >
        Back to Play
      </Link>
    </div>
  );
}
