import Link from "next/link";
import { Swords, ListOrdered, EyeOff, Trophy, HelpCircle, SplitSquareVertical } from "lucide-react";

const GAMES = [
  { slug: "this-or-that", label: "This or That", icon: Swords, blurb: "Pick a side. See if you match." },
  { slug: "top5", label: "My Top 5", icon: ListOrdered, blurb: "Rank it. Compare it." },
  { slug: "blind-rank", label: "Blind Rank", icon: EyeOff, blurb: "One at a time, no take-backs." },
  { slug: "match-predictions", label: "Match Predictions", icon: Trophy, blurb: "Call the result before kickoff." },
  { slug: "guess-mine", label: "Guess Mine", icon: HelpCircle, blurb: "How well do you know them?" },
  { slug: "keep3-drop2", label: "Keep 3, Drop 2", icon: SplitSquareVertical, blurb: "Hard choices only." },
] as const;

export default function PlayHubPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 font-display text-3xl">Play</h1>
      <p className="mb-6 text-sm text-ink-soft">Little games that say more than a chat ever could.</p>
      <div className="grid grid-cols-2 gap-3">
        {GAMES.map(({ slug, label, icon: Icon, blurb }, i) => (
          <Link
            key={slug}
            href={`/play/${slug}`}
            className="flex flex-col gap-3 rounded-[28px] border border-line bg-paper-raised p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ transform: i % 2 === 1 ? "rotate(0.6deg)" : "rotate(-0.6deg)" }}
          >
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Icon size={22} />
            </div>
            <div>
              <p className="font-display text-lg leading-tight">{label}</p>
              <p className="text-xs text-ink-soft">{blurb}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
