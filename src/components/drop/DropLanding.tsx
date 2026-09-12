"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Image as ImageIcon, Music2, Type as TypeIcon, MapPin, Star } from "lucide-react";
import type { DropType } from "@/services/posts-client";
import { DropTypeCard } from "@/components/drop/DropTypeCard";
import { RecentMediaRail } from "@/components/drop/RecentMediaRail";
import { DropIdeas } from "@/components/drop/DropIdeas";
import { DropComposer } from "@/components/drop/DropComposer";
import { PageIntro } from "@/components/app/PageIntro";

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
      <PageIntro
        title={isStory ? "New story" : "Drop something"}
        subtitle={isStory ? "Visible for 24 hours, unless you save it." : "Capture the moments, big or small."}
      />

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
    if (shots.length === 0) return <ImageIcon size={30} className="text-[#00000030]" />;
    return (
      <div className="relative h-[76px] w-[84px]">
        {shots.map((m, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={m.id}
            src={m.url}
            alt=""
            className="absolute h-16 w-16 rounded-xl border-2 border-white object-cover shadow-sm"
            style={{ right: i * 16, bottom: i * 8, zIndex: shots.length - i }}
          />
        ))}
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="grid h-[70px] w-[78px] place-items-center rounded-xl bg-[#00000010]">
        <ImageIcon size={26} className="text-[#00000040]" />
      </div>
    );
  }

  if (type === "song") {
    return (
      <div className="grid h-[70px] w-[70px] place-items-center rounded-xl bg-[#00000012]">
        <Music2 size={26} className="text-[#00000045]" />
      </div>
    );
  }

  if (type === "text") {
    if (!recentCaption) return <TypeIcon size={28} className="text-[#00000030]" />;
    return (
      <div className="max-w-[140px] rounded-xl bg-white/70 px-3 py-2.5 text-[12.5px] leading-snug text-[#5c574c] shadow-sm">
        {`"${recentCaption.slice(0, 40)}${recentCaption.length > 40 ? "…" : ""}"`}
      </div>
    );
  }

  if (type === "activity") {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-2 shadow-sm">
        <MapPin size={14} className="text-[#2f6fa3]" />
        {recentPlace && <span className="text-[12.5px] font-medium text-[#3a362f]">{recentPlace}</span>}
      </div>
    );
  }

  return (
    <div className="grid h-[68px] w-[68px] place-items-center rounded-xl bg-[#00000012]">
      <Star size={28} className="fill-[#00000022] text-[#00000038]" />
    </div>
  );
}
