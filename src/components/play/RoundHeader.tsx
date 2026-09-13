import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

/**
 * Shared header for every game's active-gameplay screen: back arrow +
 * title + a purely cosmetic "N of 10" progress pill on the right, then
 * a colored category pill (icon + label, using the same per-game colors
 * as the Play hub cards) and the round's bold question heading.
 */
export function RoundHeader({
  slug,
  title,
  category,
  icon: Icon,
  pillBg,
  pillColor,
  roundNumber,
  roundTotal = 10,
  question,
}: {
  slug: string;
  title: string;
  category: string;
  icon: LucideIcon;
  pillBg: string;
  pillColor: string;
  roundNumber: number;
  roundTotal?: number;
  question: string;
}) {
  const pct = Math.min(100, Math.round((roundNumber / roundTotal) * 100));
  return (
    <div className="pb-4 pt-1">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/play/${slug}`}
            aria-label="Back"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#3a362f] shadow-sm"
          >
            <ArrowLeft size={19} strokeWidth={2} />
          </Link>
          <p className="truncate text-[17px] font-bold tracking-tight text-[#3a362f]">{title}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold text-[#a39d92]">
            {roundNumber} of {roundTotal}
          </p>
          <div className="mt-1 h-1.5 w-14 overflow-hidden rounded-full bg-[#f2efe9]">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pillColor }} />
          </div>
        </div>
      </div>
      <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ backgroundColor: pillBg }}>
        <Icon size={13} style={{ color: pillColor }} strokeWidth={2.25} />
        <span className="text-[12px] font-semibold" style={{ color: pillColor }}>
          {category}
        </span>
      </div>
      <h1 className="text-[21px] font-bold leading-tight text-[#3a362f]">{question}</h1>
    </div>
  );
}
