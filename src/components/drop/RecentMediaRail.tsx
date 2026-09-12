"use client";

import Link from "next/link";

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
        <p className="text-[19px] font-bold text-[#3a362f]">Recent photos</p>
        <Link href="/memories" className="text-[14px] font-medium text-[#a39d92]">
          See all
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
            <span className="absolute right-1.5 top-1.5 h-4 w-4 rounded-full border-2 border-white/90" />
          </button>
        ))}
      </div>
    </div>
  );
}
