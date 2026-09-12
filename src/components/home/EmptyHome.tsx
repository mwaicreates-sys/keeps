import Link from "next/link";
import { Camera, Type } from "lucide-react";

export function EmptyHome() {
  return (
    <div className="mx-4 mb-4 rounded-[26px] bg-white p-6 text-center shadow-[0_2px_16px_-6px_rgba(20,18,15,0.12)]">
      <p className="text-[15px] font-medium text-[#3a362f]">Your space starts here.</p>
      <p className="mt-1 text-sm text-[#a39d92]">The first Drop shows up for both of you.</p>
      <div className="mt-4 flex justify-center gap-2">
        <Link
          href="/drop"
          className="flex items-center gap-1.5 rounded-full bg-[#3a362f] px-4 py-2 text-sm font-medium text-white"
        >
          <Camera size={15} /> Add a photo
        </Link>
        <Link
          href="/drop"
          className="flex items-center gap-1.5 rounded-full bg-[#f2efe9] px-4 py-2 text-sm font-medium text-[#3a362f]"
        >
          <Type size={15} /> Share a thought
        </Link>
      </div>
    </div>
  );
}
