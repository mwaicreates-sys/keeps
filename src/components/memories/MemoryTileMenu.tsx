"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toggleMemory } from "@/services/posts-client";

/**
 * The small "…" on each memory tile. Stops its own click from bubbling
 * to the tile's wrapping <Link> (which navigates to the memory itself).
 * Only action for now is unsaving a memory -- the post itself isn't
 * deleted, it just stops showing up here.
 */
export function MemoryTileMenu({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="More options"
        className="grid h-5 w-5 place-items-center rounded-full text-[#a39d92]"
      >
        <MoreHorizontal size={13} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="absolute right-0 top-6 z-20 w-40 rounded-xl bg-white p-1 shadow-[0_8px_24px_-6px_rgba(20,18,15,0.25)] ring-1 ring-black/5">
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                await toggleMemory(postId, true).catch(() => {});
                router.refresh();
              }}
              className="w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium text-[#3a362f] hover:bg-[#f2efe9]"
            >
              Remove from Memories
            </button>
          </div>
        </>
      )}
    </div>
  );
}
