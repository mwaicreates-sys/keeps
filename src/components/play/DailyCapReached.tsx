import Link from "next/link";
import { CheckCircle2, type LucideIcon } from "lucide-react";

/**
 * Rendered by a game's base route instead of its Launcher once this
 * user has already started DAILY_PLAY_CAP sessions of that game type
 * today -- the server-rendered counterpart to GameLauncher's own
 * DailyCapReachedError handling (which only fires if a session slips
 * past this check, e.g. a same-second race). Reusing the exact "Done
 * for today" copy in both places, so however the player gets here it
 * always says the same thing.
 */
export function DailyCapReached({ label, icon: Icon, bg, iconColor }: { label: string; icon: LucideIcon; bg: string; iconColor: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: bg, color: iconColor }}>
        <Icon size={26} />
      </div>
      <p className="flex items-center gap-1.5 text-[15px] font-semibold text-[#3a362f]">
        <CheckCircle2 size={17} /> Done for today
      </p>
      <p className="mt-1 text-[13px] text-[#a39d92]">You&apos;ve played {label} 5 times today -- come back tomorrow for more.</p>
      <Link
        href="/play"
        className="mt-5 rounded-full bg-[#3a362f] px-5 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98]"
      >
        Back to Play
      </Link>
    </div>
  );
}
