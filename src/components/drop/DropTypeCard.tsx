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
 * One hero card in the Drop type grid. `preview` is a small type-specific
 * hint (a couple of thumbnails, a scrap of real caption text, …) so six
 * cards don't read as six identical icon buttons. Laid out top-to-bottom
 * in normal flow (icon+chevron, then label/subtitle, then the preview
 * pinned to the bottom via `mt-auto`) rather than absolutely positioned —
 * a stray preview can never overlap the label/subtitle text this way, no
 * matter how long a real caption or place name turns out to be.
 */
export function DropTypeCard({
  type,
  onSelect,
  preview,
}: {
  type: DropType;
  onSelect: () => void;
  preview?: React.ReactNode;
}) {
  const { bg, iconBg, iconColor, label, subtitle, icon: Icon } = CARD_STYLE[type];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-h-[176px] flex-col rounded-[26px] px-4 py-3.5 text-left transition active:scale-[0.98]"
      style={{ backgroundColor: bg }}
    >
      <div className="flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ backgroundColor: iconBg, color: iconColor }}>
          <Icon size={23} strokeWidth={2} />
        </span>
        <span className="-m-2 grid h-9 w-9 place-items-center">
          <ChevronRight size={19} className="text-[#00000060]" />
        </span>
      </div>

      <div className="mt-2.5 min-w-0">
        <p className="text-[16.5px] font-bold leading-tight text-[#2c281f]">{label}</p>
        <p className="mt-0.5 text-[12px] leading-[1.35] text-[#5c574c]">{subtitle}</p>
      </div>

      {preview && <div className="mt-auto min-w-0 pt-2.5">{preview}</div>}
    </button>
  );
}
