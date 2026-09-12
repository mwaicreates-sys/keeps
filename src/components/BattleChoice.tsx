"use client";

import { cn } from "@/lib/utils";

/**
 * The shared "collision" battle UI: two tilted, overlapping cards with a
 * circular badge at the seam. Used by This or That, Guess Mine, and the
 * match-winner picker in Match Predictions (with a third "draw" option).
 */
export function BattleChoice({
  optionA,
  optionB,
  imageA,
  imageB,
  draw,
  selected,
  onSelect,
  onSelectDraw,
  revealed,
  badge = "OR",
}: {
  optionA: string;
  optionB: string;
  imageA?: string | null;
  imageB?: string | null;
  draw?: string;
  selected?: "A" | "B" | "DRAW" | null;
  onSelect?: (choice: "A" | "B") => void;
  onSelectDraw?: () => void;
  revealed?: boolean;
  badge?: string;
}) {
  const locked = revealed || selected != null;

  return (
    <div className="relative flex items-center justify-center py-6">
      <button
        type="button"
        disabled={locked && selected !== "A"}
        onClick={() => onSelect?.("A")}
        className={cn(
          "relative z-10 flex h-52 w-40 -rotate-6 flex-col items-center justify-end overflow-hidden rounded-3xl border-2 bg-paper-raised p-4 text-center shadow-md transition-all duration-300",
          selected === "A" ? "z-20 -translate-x-2 rotate-0 scale-105 border-accent" : "border-line",
          locked && selected !== "A" && "opacity-40 grayscale"
        )}
        style={{ marginRight: -28 }}
      >
        {imageA && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageA} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span className={cn("relative font-display text-lg leading-tight", imageA && "text-white drop-shadow")}>
          {optionA}
        </span>
      </button>

      <div className="relative z-30 grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-ink bg-paper font-display text-sm font-bold shadow">
        {draw ? "X" : badge}
      </div>

      <button
        type="button"
        disabled={locked && selected !== "B"}
        onClick={() => onSelect?.("B")}
        className={cn(
          "relative z-10 flex h-52 w-40 rotate-6 flex-col items-center justify-end overflow-hidden rounded-3xl border-2 bg-paper-raised p-4 text-center shadow-md transition-all duration-300",
          selected === "B" ? "z-20 translate-x-2 rotate-0 scale-105 border-accent" : "border-line",
          locked && selected !== "B" && "opacity-40 grayscale"
        )}
        style={{ marginLeft: -28 }}
      >
        {imageB && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageB} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span className={cn("relative font-display text-lg leading-tight", imageB && "text-white drop-shadow")}>
          {optionB}
        </span>
      </button>

      {draw && (
        <button
          type="button"
          disabled={locked && selected !== "DRAW"}
          onClick={() => onSelectDraw?.()}
          className={cn(
            "absolute bottom-0 z-40 rounded-full border-2 bg-paper px-4 py-1.5 text-xs font-semibold transition",
            selected === "DRAW" ? "border-accent text-accent" : "border-line text-ink-soft",
            locked && selected !== "DRAW" && "opacity-40"
          )}
        >
          {draw}
        </button>
      )}
    </div>
  );
}
