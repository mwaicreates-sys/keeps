import { Crown, Heart, Star } from "lucide-react";

/**
 * Two tilted, overlapping choice cards with a small "OR" badge between
 * them — reads as "two competing choices" without committing to any one
 * choice type, since real choices may later be text or images instead of
 * these placeholder icons.
 */
export function ThisOrThatPreview() {
  return (
    <div className="relative h-[56px] w-[70px]">
      <span
        className="absolute left-0 top-1.5 grid h-11 w-11 rotate-[-8deg] place-items-center rounded-xl border-2 border-white bg-white shadow-md"
        aria-hidden
      >
        <Heart size={16} className="text-[#c2495f]" fill="currentColor" />
      </span>
      <span
        className="absolute right-0 top-0 grid h-11 w-11 rotate-[7deg] place-items-center rounded-xl border-2 border-white bg-white shadow-md"
        aria-hidden
      >
        <Star size={16} className="text-[#c99a2e]" fill="currentColor" />
      </span>
      <span
        className="absolute left-1/2 top-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#3a362f] text-[7.5px] font-bold text-white shadow-sm"
        aria-hidden
      >
        OR
      </span>
    </div>
  );
}

/** A small ranked sheet: 1–5 placeholder rows plus a crown for "the winner". */
export function Top5Preview() {
  return (
    <div className="relative h-[60px] w-[66px]">
      <div className="absolute right-0 top-1 h-[54px] w-[56px] rotate-2 rounded-lg bg-white shadow-md" />
      <div className="absolute right-1.5 top-2 w-[50px] space-y-1 rounded-lg bg-white p-2 shadow-md">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="flex items-center gap-1">
            <span className="text-[7.5px] font-bold text-[#5457c7]">{n}</span>
            <span className="h-[2px] flex-1 rounded-full bg-[#e4e4f5]" />
          </div>
        ))}
      </div>
      <span className="absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#f5c65b] text-white shadow-sm">
        <Crown size={10} fill="currentColor" />
      </span>
    </div>
  );
}

/** A small stack of face-down cards, front one showing "?". */
export function BlindRankPreview() {
  return (
    <div className="relative h-[56px] w-[58px]">
      <div className="absolute right-0 top-1.5 h-11 w-11 rotate-3 rounded-xl bg-white shadow-sm" />
      <div className="absolute right-0.5 top-0 grid h-11 w-11 rotate-[-4deg] place-items-center rounded-xl bg-white shadow-md">
        <span className="text-base font-bold text-[#2f8f52]">?</span>
      </div>
    </div>
  );
}

/**
 * A football plus a real Home/Draw/Away selector — never just a trophy
 * icon. A genuine 3-column CSS grid (not three flex pills eyeballed to
 * fit), bounded by max-width so it can never push the card wider than
 * its own grid cell.
 */
export function MatchPredictionPreview({ homeTeam }: { homeTeam?: string }) {
  return (
    <div className="flex w-full min-w-0 items-center justify-end gap-1.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-base shadow-md" aria-hidden>
        ⚽
      </span>
      <div
        className="grid min-w-0 flex-1 gap-1 rounded-xl bg-white p-1 shadow-md"
        style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", maxWidth: 118 }}
      >
        <span className="truncate rounded-lg bg-[#2f8f52] px-1 py-1 text-center text-[9px] font-semibold text-white">
          {homeTeam ? homeTeam.slice(0, 5) : "Home"}
        </span>
        <span className="truncate rounded-lg px-1 py-1 text-center text-[9px] font-medium text-[#5c574c]">Draw</span>
        <span className="truncate rounded-lg px-1 py-1 text-center text-[9px] font-medium text-[#5c574c]">Away</span>
      </div>
    </div>
  );
}

/** A hidden-thought card plus a masked-answer card — guessing the other person's pick. */
export function GuessMinePreview() {
  return (
    <div className="relative h-[54px] w-[70px]">
      <span className="absolute left-0 top-0 grid h-10 w-10 rotate-[-6deg] place-items-center rounded-xl bg-white text-base shadow-md">
        🤔
      </span>
      <span className="absolute bottom-0 right-0 grid h-7 w-11 place-items-center rounded-xl rounded-bl-sm bg-white shadow-sm">
        <span className="text-[10.5px] font-bold tracking-widest text-[#2f6fa3]">•••</span>
      </span>
    </div>
  );
}

/** Two overlapping mini-cards: a kept item and a dropped one — selection vs. elimination. */
export function KeepDropPreview() {
  return (
    <div className="relative h-[56px] w-[68px]">
      <span className="absolute left-0 top-1 grid h-11 w-11 rotate-[-5deg] place-items-center rounded-xl border-2 border-white bg-white text-lg shadow-md">
        ❤️
      </span>
      <span className="absolute right-0 top-2 grid h-9 w-9 rotate-[8deg] place-items-center rounded-xl border-2 border-white bg-white text-base text-[#c23a3a] shadow-sm opacity-80">
        ✕
      </span>
    </div>
  );
}
