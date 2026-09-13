import { ChevronRight, Image as ImageIcon, Video, Music2, Type as TypeIcon, MapPin, Star } from "lucide-react";
import type { DropType } from "@/services/posts-client";

const CARD_STYLE: Record<
  DropType,
  { bg: string; iconBg: string; iconColor: string; label: string; subtitle: string; icon: typeof ImageIcon }
> = {
  photo: { bg: "#fbe9ec", iconBg: "#f7d3d9", iconColor: "#c2495f", label: "Photos", subtitle: "Share your day", icon: ImageIcon },
  video: { bg: "#eaeafb", iconBg: "#d9d9f5", iconColor: "#5457c7", label: "Video", subtitle: "Moments in motion", icon: Video },
  song: { bg: "#e6f2e9", iconBg: "#cde7d4", iconColor: "#2f8f52", label: "Song", subtitle: "What you're listening to", icon: Music2 },
  text: { bg: "#faf1e2", iconBg: "#f2e0bd", iconColor: "#a3742b", label: "Text", subtitle: "A thought, a note", icon: TypeIcon },
  activity: { bg: "#e5eef6", iconBg: "#cfe1f2", iconColor: "#2f6fa3", label: "Activity", subtitle: "What you're doing", icon: MapPin },
  favorite: { bg: "#fdecec", iconBg: "#f8d6d6", iconColor: "#c23a3a", label: "Favorite", subtitle: "Something you love", icon: Star },
  // Rarer types reachable from the ideas rail, not the primary grid — kept
  // visually consistent in case they're ever surfaced as cards.
  link: { bg: "#eaeafb", iconBg: "#d9d9f5", iconColor: "#5457c7", label: "Link", subtitle: "Something to share", icon: TypeIcon },
  place: { bg: "#e5eef6", iconBg: "#cfe1f2", iconColor: "#2f6fa3", label: "Place", subtitle: "Where you are", icon: MapPin },
  milestone: { bg: "#fdecec", iconBg: "#f8d6d6", iconColor: "#c23a3a", label: "Milestone", subtitle: "Celebrate something", icon: Star },
  screenshot: { bg: "#fbe9ec", iconBg: "#f7d3d9", iconColor: "#c2495f", label: "Screenshot", subtitle: "Save the moment", icon: ImageIcon },
};

/**
 * One card in the Drop type grid. `preview` is a small type-specific hint
 * (a couple of thumbnails, a scrap of real caption text, …) so six cards
 * don't read as six identical icon buttons. Laid out top-to-bottom in
 * normal flow (icon+chevron, then label, then the preview pinned to the
 * bottom via `mt-auto`) rather than absolutely positioned — a stray
 * preview can never overlap the label this way.
 *
 * `bgImage`, when there's a real photo to show (a recent Photo, the
 * current Song's artwork, a photo attached to a recent Activity), turns
 * the card into a full-bleed hero: the real photo as background, a dark
 * gradient for legibility, white text. Never a stock/placeholder image —
 * a type with nothing real yet just stays a plain flat-color card.
 */
export function DropTypeCard({
  type,
  onSelect,
  bgImage,
  preview,
}: {
  type: DropType;
  onSelect: () => void;
  bgImage?: string | null;
  preview?: React.ReactNode;
}) {
  const { bg, iconBg, iconColor, label, icon: Icon } = CARD_STYLE[type];
  const hero = !!bgImage;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative flex min-h-[136px] flex-col overflow-hidden rounded-[22px] px-3.5 py-3 text-left transition active:scale-[0.98]"
      style={hero ? undefined : { backgroundColor: bg }}
    >
      {hero && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bgImage!} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />
        </>
      )}

      <div className="relative flex items-start justify-between">
        <span
          className="grid h-10 w-10 place-items-center rounded-xl"
          style={{ backgroundColor: hero ? "rgba(255,255,255,0.22)" : iconBg, color: hero ? "#fff" : iconColor }}
        >
          <Icon size={20} strokeWidth={2} />
        </span>
        <span
          className="-m-2 grid h-8 w-8 place-items-center rounded-full"
          style={hero ? { backgroundColor: "rgba(0,0,0,0.35)" } : undefined}
        >
          <ChevronRight size={17} className={hero ? "text-white" : "text-[#00000060]"} />
        </span>
      </div>

      <p className={`relative mt-2 text-[15px] font-bold leading-tight ${hero ? "text-white" : "text-[#2c281f]"}`}>{label}</p>

      {preview && <div className="relative mt-auto min-w-0 pt-2">{preview}</div>}
    </button>
  );
}
