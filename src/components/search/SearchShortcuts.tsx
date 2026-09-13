import Link from "next/link";
import { Image as ImageIcon, Video, Music2, Type as TypeIcon, MapPin, Star, FolderHeart, Gamepad2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SearchResultType } from "@/services/search-server";

const TYPE_SHORTCUTS: { type: SearchResultType; label: string; icon: LucideIcon; bg: string; color: string }[] = [
  { type: "photo", label: "Photos", icon: ImageIcon, bg: "#fbe9ec", color: "#c2495f" },
  { type: "video", label: "Video", icon: Video, bg: "#eaeafb", color: "#5457c7" },
  { type: "song", label: "Song", icon: Music2, bg: "#e6f2e9", color: "#2f8f52" },
  { type: "text", label: "Text", icon: TypeIcon, bg: "#faf1e2", color: "#a3742b" },
  { type: "activity", label: "Activity", icon: MapPin, bg: "#e5eef6", color: "#2f6fa3" },
  { type: "favorite", label: "Favorite", icon: Star, bg: "#fdecec", color: "#c23a3a" },
  { type: "collection", label: "Collections", icon: FolderHeart, bg: "#eee9e2", color: "#7c766c" },
  { type: "game", label: "Games", icon: Gamepad2, bg: "#eaeafb", color: "#5457c7" },
];

const TAGS = ["trip", "funny", "football", "music", "milestone"];

/** Type-scope shortcuts (a real Drop/game-session kind each) and tag
 * presets (the same static tags the app has always suggested). Both are
 * just links -- tapping one sets ?q= and/or ?type= and re-runs search. */
export function SearchShortcuts({ q, activeType }: { q: string; activeType?: SearchResultType }) {
  return (
    <div className="space-y-4">
      <section>
        <p className="mb-2 text-[12.5px] font-semibold text-[#3a362f]">Browse by type</p>
        <div className="grid grid-cols-4 gap-2">
          {TYPE_SHORTCUTS.map(({ type, label, icon: Icon, bg, color }) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            params.set("type", type);
            const active = activeType === type;
            return (
              <Link
                key={type}
                href={`/search?${params.toString()}`}
                className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition ${
                  active ? "ring-2 ring-[#3a362f]" : ""
                }`}
                style={{ backgroundColor: bg }}
              >
                <Icon size={17} color={color} strokeWidth={2} />
                <span className="text-[10px] font-medium" style={{ color }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <p className="mb-2 text-[12.5px] font-semibold text-[#3a362f]">Tags</p>
        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((tag) => (
            <Link
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}`}
              className="rounded-full bg-white px-3 py-1.5 text-[12px] font-medium capitalize text-[#3a362f] shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]"
            >
              {tag}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
