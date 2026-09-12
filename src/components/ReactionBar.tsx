"use client";

const EMOJIS = ["❤️", "😂", "🔥", "😭", "⭐"] as const;

export function ReactionBar({
  counts,
  mine,
  onToggle,
}: {
  counts: Record<string, number>;
  mine: Set<string>;
  onToggle: (emoji: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const active = mine.has(emoji);
        if (count === 0 && !active) {
          return (
            <button
              key={emoji}
              onClick={() => onToggle(emoji)}
              aria-label={`React with ${emoji}`}
              className="grid h-10 w-10 place-items-center rounded-full bg-[#f7f5f1] text-[17px] opacity-70 transition active:scale-90"
            >
              {emoji}
            </button>
          );
        }
        return (
          <button
            key={emoji}
            onClick={() => onToggle(emoji)}
            aria-pressed={active}
            className={`flex h-10 items-center gap-1 rounded-full px-2.5 text-[15px] transition active:scale-95 ${
              active ? "bg-[#f2efe9] ring-1 ring-[#3a362f]/15" : "bg-[#f7f5f1]"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-[12.5px] text-[#a39d92]">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
