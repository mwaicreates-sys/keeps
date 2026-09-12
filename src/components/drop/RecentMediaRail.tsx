"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * A shortcut back into photos already shared in this space — not a device
 * gallery browser (a webapp can't read the phone's photo library without
 * the user picking through the native file input each time). Tapping a
 * thumbnail opens the Photo composer ready to pick something new; it
 * doesn't pretend the old photo was just re-selected.
 */
export function RecentMediaRail({
  media,
  onThumbnailTap,
}: {
  media: { id: string; url: string }[];
  onThumbnailTap: () => void;
}) {
  if (media.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="mb-2.5 flex items-center justify-between px-4">
        <p className="text-[21px] font-bold text-[#3a362f]">Recent photos</p>
        <Link href="/memories" className="flex items-center gap-0.5 text-[14.5px] font-medium text-[#a39d92]">
          See all
          <ChevronRight size={19} />
        </Link>
      </div>
      <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-1">
        {media.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={onThumbnailTap}
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[18px] bg-[#f2efe9]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute -right-1 -top-1 grid h-10 w-10 place-items-center">
              <span className="h-6 w-6 rounded-full border-[2px] border-white/95 shadow-sm" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
