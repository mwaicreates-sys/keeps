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
              className="grid h-9 w-9 place-items-center rounded-full border border-line text-base opacity-60 transition hover:opacity-100 active:scale-90"
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
            className={`flex h-9 items-center gap-1 rounded-full border px-2.5 text-sm transition active:scale-95 ${
              active ? "border-accent bg-accent-soft" : "border-line"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs text-ink-soft">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
