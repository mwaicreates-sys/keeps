"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Image as ImageIcon, Music2, MapPin, Star } from "lucide-react";
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

/**
 * A small type-specific hint, sized to sit in normal flow at the bottom
 * of its card (see DropTypeCard) without ever needing to overlap the
 * label/subtitle above it. Every card returns something roughly the same
 * footprint (~36px tall) so the six cards read as one consistent grid.
 */
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
    const shots = recentMedia.slice(0, 3);
    if (shots.length === 0) return null;
    return (
      <div className="flex gap-1">
        {shots.map((m) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={m.id} src={m.url} alt="" className="h-9 w-9 rounded-lg border border-white/70 object-cover shadow-sm" />
        ))}
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#00000010]">
        <ImageIcon size={17} className="text-[#00000045]" />
      </div>
    );
  }

  if (type === "song") {
    return (
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#00000012]">
        <Music2 size={17} className="text-[#00000050]" />
      </div>
    );
  }

  if (type === "text") {
    if (!recentCaption) return null;
    return (
      <div className="truncate rounded-lg bg-white/70 px-2.5 py-2 text-[11px] leading-snug text-[#5c574c] shadow-sm">
        {`“${recentCaption.slice(0, 28)}${recentCaption.length > 28 ? "…" : ""}”`}
      </div>
    );
  }

  if (type === "activity") {
    if (!recentPlace) return null;
    return (
      <div className="flex w-fit max-w-full items-center gap-1 truncate rounded-full bg-white/80 px-2.5 py-1.5 text-[11px] font-medium text-[#3a362f] shadow-sm">
        <MapPin size={12} className="shrink-0 text-[#2f6fa3]" />
        <span className="truncate">{recentPlace}</span>
      </div>
    );
  }

  return (
    <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#00000012]">
      <Star size={17} className="fill-[#00000025] text-[#00000045]" />
    </div>
  );
}
