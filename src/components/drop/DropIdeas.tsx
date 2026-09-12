"use client";

import { Camera, Music2, MapPin, Type as TypeIcon, Image as ImageIcon, Star } from "lucide-react";
import type { DropType } from "@/services/posts-client";

const IDEAS: { label: string; type: DropType; icon: typeof Camera }[] = [
  { label: "A photo from today", type: "photo", icon: Camera },
  { label: "A song you love", type: "song", icon: Music2 },
  { label: "A place you visited", type: "activity", icon: MapPin },
  { label: "A random thought", type: "text", icon: TypeIcon },
  { label: "A funny screenshot", type: "photo", icon: ImageIcon },
  { label: "Something you're into", type: "favorite", icon: Star },
];

/** Inspiration, not primary navigation — kept compact and low-key. */
export function DropIdeas({ onPick }: { onPick: (type: DropType) => void }) {
  return (
    <div className="mx-4 rounded-[22px] bg-white p-4 shadow-[0_2px_12px_-6px_rgba(20,18,15,0.1)]">
      <p className="text-[15px] font-semibold text-[#3a362f]">Need ideas?</p>
      <p className="mt-0.5 text-[13px] text-[#a39d92]">Here are a few ways to Drop.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {IDEAS.map(({ label, type, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => onPick(type)}
            className="flex items-center gap-1.5 rounded-full bg-[#f7f5f1] py-2 pl-2.5 pr-3.5 text-[13px] font-medium text-[#5c574c]"
          >
            <Icon size={14} className="text-[#a39d92]" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
