import type { LucideIcon } from "lucide-react";

/**
 * A small, decorative handwritten-style line under an active round --
 * flavor copy only (no function), using the app's existing italic
 * display face (the same one behind the "keeps" wordmark) rather than
 * introducing a new script font just for this.
 */
export function RoundTagline({ text, icon: Icon }: { text: string; icon: LucideIcon }) {
  return (
    <p className="font-display mt-6 flex -rotate-1 items-center justify-center gap-1.5 text-center text-[15px] italic text-[#8b8578]">
      {text}
      <Icon size={14} className="shrink-0 -rotate-6" strokeWidth={2} />
    </p>
  );
}
