import Link from "next/link";
import { ImageOff, type LucideIcon } from "lucide-react";

/**
 * Shown instead of a game when NO visual content could be generated
 * for today at all -- every provider/kind this game type can draw
 * from came up short. Per the "no text-only opinion rounds" rule,
 * this honest unavailable state is the only acceptable alternative to
 * a real visual round; there is no text-card fallback to reach for.
 *
 * Rare in practice (it means every visual kind for this game type
 * failed at once) and self-healing: nothing is saved when this
 * happens, so the very next open of this game tries generation again
 * from scratch instead of being stuck with a bad result until
 * midnight.
 */
export function RunUnavailable({ icon: Icon, bg, iconColor, label }: { icon: LucideIcon; bg: string; iconColor: string; label: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: bg, color: iconColor }}>
        <Icon size={26} />
      </div>
      <p className="flex items-center gap-1.5 text-[15px] font-semibold text-[#3a362f]">
        <ImageOff size={16} /> {label} isn&apos;t available right now
      </p>
      <p className="mt-1.5 max-w-[26ch] text-[13.5px] text-[#a39d92]">We couldn&apos;t find enough real photos or posters for today&apos;s round. Try again in a bit.</p>
      <Link
        href="/play"
        className="mt-6 rounded-full bg-[#3a362f] px-5 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98]"
      >
        Back to Play
      </Link>
    </div>
  );
}
