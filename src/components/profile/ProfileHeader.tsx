import Link from "next/link";
import { Pencil, Users, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { Tables } from "@/lib/types";

export function ProfileHeader({
  profile,
  otherMember,
  dropCount,
  memoryCount,
  daysTogether,
  spaceCreatedAt,
}: {
  profile: Tables<"profiles">;
  otherMember: Tables<"profiles"> | null;
  dropCount: number;
  memoryCount: number;
  daysTogether: number;
  spaceCreatedAt: string;
}) {
  return (
    <div className="px-4 pb-5 pt-1">
      <div className="flex items-center gap-3.5">
        <Avatar name={profile.display_name} url={profile.avatar_url} size={68} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[19px] font-bold text-[#3a362f]">{profile.display_name}</p>
          <p className="truncate text-[12.5px] text-[#a39d92]">@{profile.handle}</p>
        </div>
        <Link
          href="/profile/edit"
          aria-label="Edit profile"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f2efe9] text-[#3a362f]"
        >
          <Pencil size={16} />
        </Link>
      </div>

      {profile.bio && <p className="mt-3 text-[13px] leading-snug text-[#5c574c]">{profile.bio}</p>}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatTile value={dropCount} label="Drops" />
        <StatTile value={memoryCount} label="Memories" />
        <StatTile value={daysTogether} label="Days" />
      </div>

      {otherMember && (
        <Link
          href="/profile/us"
          className="mt-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fdf3e0] text-[#c99a2e]">
            <Users size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-[#3a362f]">Us</p>
            <p className="truncate text-[11.5px] text-[#a39d92]">
              You &amp; {otherMember.display_name}, since{" "}
              {new Date(spaceCreatedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </p>
          </div>
          <ChevronRight size={17} className="shrink-0 text-[#c7c1b6]" />
        </Link>
      )}
    </div>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white py-2.5 text-center shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]">
      <p className="text-[15.5px] font-bold text-[#3a362f]">{value}</p>
      <p className="text-[10px] text-[#a39d92]">{label}</p>
    </div>
  );
}
