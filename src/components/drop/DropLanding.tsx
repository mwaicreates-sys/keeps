"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Send, Sparkles, Music2, MapPin, Play } from "lucide-react";
import type { DropType } from "@/services/posts-client";
import { DropTypeCard } from "@/components/drop/DropTypeCard";
import { RecentMediaRail } from "@/components/drop/RecentMediaRail";
import { DropIdeas } from "@/components/drop/DropIdeas";
import { DropComposer } from "@/components/drop/DropComposer";

const PRIMARY_TYPES: DropType[] = ["photo", "video", "song", "text", "activity", "favorite"];

type RecentSong = { title: string; artist: string | null; artworkUrl: string | null };

export function DropLanding({
  recentMedia,
  collections,
  recentCaption,
  recentPlace,
  recentActivityPhoto,
  recentSong,
  recentFavoritePhotos,
}: {
  recentMedia: { id: string; url: string }[];
  collections: { id: string; name: string }[];
  /** A real recent text Drop's caption, shown as the Text card's preview scrap — never fabricated copy. */
  recentCaption: string | null;
  /** A real recent activity/place Drop's place label — same rule, never fabricated. */
  recentPlace: string | null;
  /** A photo attached to that same recent Activity Drop, if there was one — used as the card's hero background. */
  recentActivityPhoto: string | null;
  /** The most recently shared real song, artwork included — doubles as the Song card's hero background. */
  recentSong: RecentSong | null;
  /** Up to 3 real photos attached to recent Favorite Drops. */
  recentFavoritePhotos: string[];
}) {
  const isStory = useSearchParams().get("story") === "1";
  const [openType, setOpenType] = useState<DropType | null>(null);
  const [quickCaption, setQuickCaption] = useState("");
  const [quickDraft, setQuickDraft] = useState("");

  function openRandom() {
    setOpenType(PRIMARY_TYPES[Math.floor(Math.random() * PRIMARY_TYPES.length)]);
  }

  function submitQuick(e: React.FormEvent) {
    e.preventDefault();
    const value = quickDraft.trim();
    if (!value) return;
    setQuickCaption(value);
    setOpenType("text");
  }

  if (openType) {
    return (
      <DropComposer
        type={openType}
        isStory={isStory}
        collections={collections}
        initialCaption={openType === "text" ? quickCaption : undefined}
        onClose={() => {
          setOpenType(null);
          setQuickCaption("");
          setQuickDraft("");
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-1">
        <div>
          <h1 className="text-[32px] font-bold leading-[1.1] tracking-tight text-[#3a362f]">
            {isStory ? "New story" : "Drop"}
          </h1>
          <p className="mt-1 text-[11.5px] font-semibold uppercase tracking-wide text-[#a39d92]">
            {isStory ? "Visible for 24 hours, unless you save it." : "Capture the moments, big or small."}
          </p>
        </div>
        {!isStory && (
          <button
            type="button"
            onClick={openRandom}
            aria-label="Surprise me — pick a Drop type at random"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f2efe9] text-[#c2ab5a]"
          >
            <Sparkles size={20} />
          </button>
        )}
      </div>

      {!isStory && (
        <form onSubmit={submitQuick} className="mb-5 px-4">
          <label className="flex items-center gap-2.5 rounded-full bg-white px-4 py-3 shadow-[0_1px_8px_-4px_rgba(20,18,15,0.15)]">
            <Search size={18} strokeWidth={2} className="shrink-0 text-[#a39d92]" />
            <input
              value={quickDraft}
              onChange={(e) => setQuickDraft(e.target.value)}
              placeholder="What do you want to drop?"
              className="min-w-0 flex-1 bg-transparent text-[14.5px] text-[#3a362f] outline-none placeholder:text-[#a39d92]"
            />
            {quickDraft.trim() && (
              <button
                type="submit"
                aria-label="Drop this thought"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#3a362f] text-white"
              >
                <Send size={12} strokeWidth={2.2} />
              </button>
            )}
          </label>
        </form>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 px-4">
        {PRIMARY_TYPES.map((type) => (
          <DropTypeCard
            key={type}
            type={type}
            onSelect={() => setOpenType(type)}
            bgImage={heroImageFor(type, { recentMedia, recentActivityPhoto, recentSong })}
            preview={
              <TypePreview
                type={type}
                recentMedia={recentMedia}
                recentCaption={recentCaption}
                recentPlace={recentPlace}
                recentSong={recentSong}
                recentFavoritePhotos={recentFavoritePhotos}
              />
            }
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

/** Only Photo/Song/Activity ever get a full-bleed photo background — each
 * from data that's already real (a recent photo, the current song's own
 * artwork, a photo actually attached to a recent Activity Drop). Every
 * other type stays a plain flat-color card rather than show a stand-in. */
function heroImageFor(
  type: DropType,
  data: {
    recentMedia: { id: string; url: string }[];
    recentActivityPhoto: string | null;
    recentSong: RecentSong | null;
  }
): string | null {
  if (type === "photo") return data.recentMedia[0]?.url ?? null;
  if (type === "activity") return data.recentActivityPhoto;
  if (type === "song") return data.recentSong?.artworkUrl ?? null;
  return null;
}

/**
 * A small type-specific hint, sized to sit in normal flow at the bottom
 * of its card (see DropTypeCard) without ever overlapping the label
 * above it. Returns null whenever there's no real data for that type yet
 * — never a generic placeholder icon standing in for real content.
 */
function TypePreview({
  type,
  recentMedia,
  recentCaption,
  recentPlace,
  recentSong,
  recentFavoritePhotos,
}: {
  type: DropType;
  recentMedia: { id: string; url: string }[];
  recentCaption: string | null;
  recentPlace: string | null;
  recentSong: RecentSong | null;
  recentFavoritePhotos: string[];
}) {
  if (type === "photo") {
    // Skip the one already used as the card's own hero background.
    const extra = recentMedia.slice(1, 4);
    if (extra.length === 0) return null;
    return (
      <div className="flex gap-1">
        {extra.map((m) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={m.id} src={m.url} alt="" className="h-8 w-8 rounded-lg border border-white/60 object-cover shadow-sm" />
        ))}
      </div>
    );
  }

  if (type === "song") {
    if (!recentSong) return null;
    return (
      <div className="flex items-center gap-2 rounded-full bg-black/40 py-1 pl-1 pr-1 backdrop-blur-sm">
        {recentSong.artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recentSong.artworkUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/20 text-white">
            <Music2 size={13} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold leading-tight text-white">{recentSong.title}</p>
          {recentSong.artist && <p className="truncate text-[10px] leading-tight text-white/70">{recentSong.artist}</p>}
        </div>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[#3a362f]">
          <Play size={11} fill="currentColor" strokeWidth={0} />
        </span>
      </div>
    );
  }

  if (type === "text") {
    if (!recentCaption) return null;
    return (
      <div className="truncate rounded-lg bg-white/85 px-2.5 py-2 text-[11px] leading-snug text-[#5c574c] shadow-sm">
        {`“${recentCaption.slice(0, 28)}${recentCaption.length > 28 ? "…" : ""}”`}
      </div>
    );
  }

  if (type === "activity") {
    if (!recentPlace) return null;
    return (
      <div className="flex w-fit max-w-full items-center gap-1 truncate rounded-full bg-white/85 px-2.5 py-1.5 text-[11px] font-medium text-[#3a362f] shadow-sm">
        <MapPin size={12} className="shrink-0 text-[#2f6fa3]" />
        <span className="truncate">{recentPlace}</span>
      </div>
    );
  }

  if (type === "favorite") {
    if (recentFavoritePhotos.length === 0) return null;
    return (
      <div className="flex gap-1">
        {recentFavoritePhotos.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url} src={url} alt="" className="h-8 w-8 rounded-lg border border-white/60 object-cover shadow-sm" />
        ))}
      </div>
    );
  }

  return null;
}
