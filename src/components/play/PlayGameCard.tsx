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
      className="relative flex h-[224px] w-full min-w-0 flex-col justify-between overflow-hidden rounded-[26px] px-4 py-4 transition active:scale-[0.98]"
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

      <div className="absolute right-4 top-[68px] max-w-[46%] overflow-hidden">{preview}</div>

      <div className="min-w-0 max-w-[72%]">
        <p className="text-[20px] font-extrabold leading-tight text-[#2c281f]">{title}</p>
        <p className="mt-1 text-[14.5px] leading-[1.35] text-[#5c574c]">{subtitle}</p>
      </div>
    </Link>
  );
}
