import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Own back-arrow header, same convention as Notifications/the memory
 * detail page -- back always goes to the Play hub, not browser history,
 * since a game can also be opened from a notification. */
export function GameHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 px-3 pb-3 pt-2">
      <Link href="/play" aria-label="Back" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#3a362f]">
        <ArrowLeft size={20} strokeWidth={2} />
      </Link>
      <div className="min-w-0">
        <p className="truncate text-[19px] font-bold tracking-tight text-[#3a362f]">{title}</p>
        <p className="truncate text-[12.5px] text-[#a39d92]">{subtitle}</p>
      </div>
    </div>
  );
}
