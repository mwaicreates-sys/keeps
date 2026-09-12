import { Star, Heart, Gem, Sparkle } from "lucide-react";

const STICKERS = [
  { Icon: Star, top: "8%", left: "10%", rotate: -18, color: "#facc15", size: 22 },
  { Icon: Heart, top: "14%", left: "82%", rotate: 12, color: "#fb7185", size: 20 },
  { Icon: Gem, top: "68%", left: "6%", rotate: 10, color: "#38bdf8", size: 18 },
  { Icon: Sparkle, top: "78%", left: "88%", rotate: -10, color: "#a78bfa", size: 20 },
  { Icon: Star, top: "40%", left: "92%", rotate: 20, color: "#4ade80", size: 16 },
  { Icon: Heart, top: "88%", left: "30%", rotate: -8, color: "#fb923c", size: 16 },
] as const;

/** The scattered sticker-confetti background used behind the auth shell. */
export function StickerField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {STICKERS.map(({ Icon, top, left, rotate, color, size }, i) => (
        <Icon
          key={i}
          size={size}
          style={{
            position: "absolute",
            top,
            left,
            transform: `rotate(${rotate}deg)`,
            color,
          }}
          className="opacity-70"
          fill={color}
        />
      ))}
    </div>
  );
}
