"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Image as ImageIcon, Music2, Type as TypeIcon, MapPin, Star } from "lucide-react";
import type { DropType } from "@/services/posts-client";
import { DropTypeCard } from "@/components/drop/DropTypeCard";
import { RecentMediaRail } from "@/components/drop/RecentMediaRail";
import { DropIdeas } from "@/components/drop/DropIdeas";
import { DropComposer } from "@/components/drop/DropComposer";

const PRIMARY_TYPES: DropType[] = ["photo", "video", "song", "text", "activity", "favorite"];

export function DropLanding({
  recentMedia,
  collections,
  recentCaption,
  recentPlace,
}: {
  recentMedia: { id: string; url: string }[];
  collections: { id: string; name: string }[];
  /** A real recent text Drop's caption, shown as the Text card's preview scrap — never fabricated copy. */
  recentCaption: string | null;
  /** A real recent activity/place Drop's place label — same rule, never fabricated. */
  recentPlace: string | null;
}) {
  const isStory = useSearchParams().get("story") === "1";
  const [openType, setOpenType] = useState<DropType | null>(null);

  if (openType) {
    return <DropComposer type={openType} isStory={isStory} collections={collections} onClose={() => setOpenType(null)} />;
  }

  return (
    <div>
      <div className="px-4 pb-4 pt-1">
        <h1 className="text-[29px] font-bold tracking-tight text-[#3a362f]">{isStory ? "New story" : "Drop something"}</h1>
        <p className="mt-0.5 text-[15px] text-[#a39d92]">
          {isStory ? "Visible for 24 hours, unless you save it." : "Capture the moments, big or small."}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 px-4">
        {PRIMARY_TYPES.map((type) => (
          <DropTypeCard
            key={type}
            type={type}
            onSelect={() => setOpenType(type)}
            preview={<TypePreview type={type} recentMedia={recentMedia} recentCaption={recentCaption} recentPlace={recentPlace} />}
          />
        ))}
      </div>

      {!isStory && (
        <>
          <RecentMediaRail media={recentMedia} onThumbnailTap={() => setOpenType("photo")} />
          <DropIdeas onPick={setOpenType} />
        </>
      )}
    </div>
  );
}

function TypePreview({
  type,
  recentMedia,
  recentCaption,
  recentPlace,
}: {
  type: DropType;
  recentMedia: { id: string; url: string }[];
  recentCaption: string | null;
  recentPlace: string | null;
}) {
  if (type === "photo") {
    const shots = recentMedia.slice(0, 2);
    if (shots.length === 0) return <ImageIcon size={26} className="text-[#00000030]" />;
    return (
      <div className="relative h-14 w-16">
        {shots.map((m, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={m.id}
            src={m.url}
            alt=""
            className="absolute h-11 w-11 rounded-xl border-2 border-white object-cover shadow-sm"
            style={{ right: i * 14, bottom: i * 6, zIndex: shots.length - i }}
          />
        ))}
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="grid h-14 w-16 place-items-center rounded-xl bg-[#00000010]">
        <ImageIcon size={22} className="text-[#00000040]" />
      </div>
    );
  }

  if (type === "song") {
    return (
      <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#00000012]">
        <Music2 size={22} className="text-[#00000045]" />
      </div>
    );
  }

  if (type === "text") {
    if (!recentCaption) return <TypeIcon size={24} className="text-[#00000030]" />;
    return (
      <div className="max-w-[130px] rounded-xl bg-white/70 px-2.5 py-2 text-[11px] leading-snug text-[#5c574c] shadow-sm">
        {`"${recentCaption.slice(0, 40)}${recentCaption.length > 40 ? "…" : ""}"`}
      </div>
    );
  }

  if (type === "activity") {
    return (
      <div className="flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1.5 shadow-sm">
        <MapPin size={12} className="text-[#2f6fa3]" />
        {recentPlace && <span className="text-[11px] font-medium text-[#3a362f]">{recentPlace}</span>}
      </div>
    );
  }

  return <Star size={24} className="fill-[#00000018] text-[#00000030]" />;
}
