import { Heart, ListOrdered, EyeOff, Trophy, HelpCircle, Scissors, Music, Sparkles, Smile, type LucideIcon } from "lucide-react";
import type { GameType } from "@/services/games-client";

export type PlayGameConfig = {
  type: GameType;
  slug: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  bg: string;
  iconBg: string;
  iconColor: string;
  /** A short, decorative handwritten-style line shown under the active
   * round -- flavor copy only, not shown anywhere functional. */
  tagline?: string;
  taglineIcon?: LucideIcon;
};

/** Single source of truth for every game's route, copy, icon and color —
 * used by both the Play hub grid and each game page's own header. */
export const PLAY_GAMES: PlayGameConfig[] = [
  {
    type: "this_or_that",
    slug: "this-or-that",
    label: "This or That",
    subtitle: "Pick a side, see if you match.",
    icon: Heart,
    bg: "#fbe9ec",
    iconBg: "#f7d3d9",
    iconColor: "#c2495f",
    tagline: "Music hits different together",
    taglineIcon: Music,
  },
  {
    type: "top5",
    slug: "top5",
    label: "My Top 5",
    subtitle: "Rank it. Compare lists.",
    icon: ListOrdered,
    bg: "#eaeafb",
    iconBg: "#d9d9f5",
    iconColor: "#5457c7",
  },
  {
    type: "blind_rank",
    slug: "blind-rank",
    label: "Blind Rank",
    subtitle: "Rank in secret, reveal together.",
    icon: EyeOff,
    bg: "#e6f2e9",
    iconBg: "#cde7d4",
    iconColor: "#2f8f52",
    tagline: "Music tastes say a lot",
    taglineIcon: Sparkles,
  },
  {
    type: "match_predictions",
    slug: "match-predictions",
    label: "Match Predictions",
    subtitle: "Call the score before kickoff.",
    icon: Trophy,
    bg: "#e5eef6",
    iconBg: "#cfe1f2",
    iconColor: "#2f6fa3",
  },
  {
    type: "guess_mine",
    slug: "guess-mine",
    label: "Guess Mine",
    subtitle: "Guess what they'd pick.",
    icon: HelpCircle,
    bg: "#faf1e2",
    iconBg: "#f2e0bd",
    iconColor: "#a3742b",
    tagline: "Different choices. Same good company.",
    taglineIcon: Smile,
  },
  {
    type: "keep3_drop2",
    slug: "keep3-drop2",
    label: "Keep 3, Drop 2",
    subtitle: "Only room for three.",
    icon: Scissors,
    bg: "#fdecec",
    iconBg: "#f8d6d6",
    iconColor: "#c23a3a",
    tagline: "More than answers. A closer you.",
    taglineIcon: Heart,
  },
];

export function playGame(slug: string): PlayGameConfig {
  const found = PLAY_GAMES.find((g) => g.slug === slug);
  if (!found) throw new Error(`Unknown play game slug: ${slug}`);
  return found;
}
