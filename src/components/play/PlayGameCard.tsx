import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PlayGameCard({
  href,
  bg,
  iconBg,
  iconColor,
  icon: Icon,
  title,
  subtitle,
  preview,
}: {
  href: string;
  bg: string;
  iconBg: string;
  iconColor: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  subtitle: string;
  preview: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="relative flex h-[224px] w-full min-w-0 flex-col overflow-hidden rounded-[26px] px-4 py-4 transition active:scale-[0.98]"
      style={{ backgroundColor: bg }}
    >
      <div className="flex items-start justify-between">
        <span className="grid h-[52px] w-[52px] place-items-center rounded-2xl" style={{ backgroundColor: iconBg, color: iconColor }}>
          <Icon size={30} strokeWidth={2} />
        </span>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/70">
          <ChevronRight size={23} className="text-[#00000060]" />
        </span>
      </div>

      {/* This spacer — not absolute positioning against the whole card —
          is what actually reserves the preview's space. A two-line title
          (This or That, Match Predictions, Guess Mine) grows the title
          block below and shrinks this spacer in response, so the preview
          gets pushed/clipped instead of sitting on top of the text. */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute right-0 top-0 max-w-[58%]">{preview}</div>
      </div>

      <div className="min-w-0 max-w-[72%] shrink-0">
        <p className="text-[20px] font-extrabold leading-tight text-[#2c281f]">{title}</p>
        <p className="mt-1 text-[14.5px] leading-[1.35] text-[#5c574c]">{subtitle}</p>
      </div>
    </Link>
  );
}
