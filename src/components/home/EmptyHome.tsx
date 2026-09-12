import Link from "next/link";
import { Camera, Type } from "lucide-react";

export function EmptyHome() {
  return (
    <div className="mx-4 mb-4 rounded-2xl bg-white p-4 text-center shadow-[0_2px_12px_-6px_rgba(20,18,15,0.1)]">
      <p className="text-[13px] font-medium text-[#3a362f]">Your space starts here.</p>
      <p className="mt-0.5 text-xs text-[#a39d92]">The first Drop shows up for both of you.</p>
      <div className="mt-3 flex justify-center gap-2">
        <Link
          href="/drop"
          className="flex items-center gap-1 rounded-full bg-[#3a362f] px-3 py-1.5 text-xs font-medium text-white"
        >
          <Camera size={13} /> Add a photo
        </Link>
        <Link
          href="/drop"
          className="flex items-center gap-1 rounded-full bg-[#f2efe9] px-3 py-1.5 text-xs font-medium text-[#3a362f]"
        >
          <Type size={13} /> Share a thought
        </Link>
      </div>
    </div>
  );
}
