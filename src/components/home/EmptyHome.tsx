import Link from "next/link";
import { Camera, Type } from "lucide-react";

export function EmptyHome() {
  return (
    <div className="mx-4 mb-4 rounded-xl bg-white p-3.5 text-center shadow-[0_2px_12px_-6px_rgba(20,18,15,0.1)]">
      <p className="text-[12px] font-medium text-[#3a362f]">Your space starts here.</p>
      <p className="mt-0.5 text-[10.5px] text-[#a39d92]">The first Drop shows up for both of you.</p>
      <div className="mt-2.5 flex justify-center gap-1.5">
        <Link
          href="/drop"
          className="flex items-center gap-1 rounded-full bg-[#3a362f] px-2.5 py-1 text-[10.5px] font-medium text-white"
        >
          <Camera size={11} /> Add a photo
        </Link>
        <Link
          href="/drop"
          className="flex items-center gap-1 rounded-full bg-[#f2efe9] px-2.5 py-1 text-[10.5px] font-medium text-[#3a362f]"
        >
          <Type size={11} /> Share a thought
        </Link>
      </div>
    </div>
  );
}
