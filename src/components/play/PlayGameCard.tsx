import Link from "next/link";
import { ChevronRight, Check } from "lucide-react";

/**
 * Normal document flow only for the primary zones — top row, text, preview
 * — stacked with `flex-col`, never absolutely positioned against the card.
 * That's what guarantees a wrapped title can never collide with the
 * preview graphic: the preview is a later sibling, so it's simply pushed
 * down by however tall the text block turns out to be, and `overflow-hidden`
 * + `min-h-0` on the preview zone clips it rather than letting it escape.
 */
export function PlayGameCard({
  href,
  bg,
  iconBg,
  iconColor,
  icon: Icon,
  title,
  subtitle,
  preview,
  playedToday,
}: {
  href: string;
  bg: string;
  iconBg: string;
  iconColor: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  subtitle: string;
  preview: React.ReactNode;
  /** This player has already completed today's run of this game --
   * shows a small "played today" checkmark instead of changing the tap
   * target (opening it still shows results/waiting, never regenerates
   * another run). */
  playedToday?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[152px] w-full min-w-0 flex-col rounded-[20px] p-3 transition active:scale-[0.98]"
      style={{ backgroundColor: bg }}
    >
      <div className="flex items-start justify-between">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: iconBg, color: iconColor }}>
          <Icon size={21} strokeWidth={2} />
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70">
          <ChevronRight size={16} className="text-[#00000060]" />
        </span>
      </div>

      <div className="mt-2 min-w-0 shrink-0">
        <p className="flex items-center gap-1.5 text-[15px] font-bold leading-tight text-[#2c281f]">
          {title}
          {playedToday && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/70 px-1.5 py-0.5 text-[9.5px] font-bold text-[#2f8f52]">
              <Check size={10} strokeWidth={3} /> Played today
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[11.5px] leading-[1.3] text-[#5c574c]">{subtitle}</p>
      </div>

      <div className="mt-2 flex min-h-0 min-w-0 flex-1 items-end justify-end overflow-hidden">{preview}</div>
    </Link>
  );
}
