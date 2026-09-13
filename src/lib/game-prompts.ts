// Built-in prompt packs so Play works without any AI dependency -- the
// last-resort fallback when a real provider pool comes up short.
//
// Per the global image-first Play rule, a fallback entry must never
// name a concrete, visualizable entity (a specific person, franchise,
// game, dish, or place -- exactly the "FIFA vs Call of Duty" pattern
// the rule exists to prevent) unless a real image source exists for it.
// Movies/TV/people now have one (TMDb) and are served as real,
// image-backed rounds by pickChoicePrompt/pickBlindRankPrompt/
// pickKeepDropPrompt directly -- they don't need a text duplicate here.
// Football, Games, Food, and Places have no image provider yet, so
// their entity-naming prompts are deliberately left out of these packs
// rather than shown as naked text; only genuinely abstract preferences/
// activities (no single "thing" to picture) remain.
export type ThisOrThatPrompt = { optionA: string; optionB: string; category: string };
export const THIS_OR_THAT_PACK: ThisOrThatPrompt[] = [
  { category: "Music", optionA: "Studio album", optionB: "Live album" },
  { category: "Music", optionA: "Vinyl", optionB: "Streaming" },
  { category: "Football", optionA: "Watch at the stadium", optionB: "Watch at home" },
  { category: "Movies", optionA: "Cinema", optionB: "Home cinema night" },
  { category: "Food", optionA: "Sweet", optionB: "Savory" },
  { category: "Random", optionA: "Morning person", optionB: "Night owl" },
  { category: "Random", optionA: "Texting", optionB: "Calling" },
  { category: "Preferences", optionA: "Window seat", optionB: "Aisle seat" },
];

export type Top5Prompt = { topic: string; category: string };
export const TOP5_PACK: Top5Prompt[] = [
  { category: "Music", topic: "Top 5 songs on repeat right now" },
  { category: "Football", topic: "Top 5 footballers of all time" },
  { category: "Movies", topic: "Top 5 movies of all time" },
  { category: "Games", topic: "Top 5 games you'd replay forever" },
  { category: "Food", topic: "Top 5 meals you'd never get tired of" },
  { category: "Places", topic: "Top 5 places you want to visit" },
  { category: "Random", topic: "Top 5 things that instantly make your day better" },
];

export type BlindRankPrompt = { items: string[]; category: string; topic: string };
export const BLIND_RANK_PACK: BlindRankPrompt[] = [
  {
    category: "Music",
    topic: "Rank these eras",
    items: ["2000s", "2010s", "90s", "80s", "Right now"],
  },
  {
    category: "Football",
    topic: "Rank these positions to play",
    items: ["Striker", "Goalkeeper", "Winger", "Defender", "Midfielder"],
  },
  {
    category: "Food",
    topic: "Rank these cuisines",
    items: ["Italian", "Kenyan", "Japanese", "Indian", "Mexican"],
  },
];

export type GuessMinePrompt = { question: string; optionA: string; optionB: string; category: string };
export const GUESS_MINE_PACK: GuessMinePrompt[] = [
  { category: "Preferences", question: "Late night drive or stay home?", optionA: "Late night drive", optionB: "Stay home" },
  { category: "Food", question: "Cook at home or order in?", optionA: "Cook at home", optionB: "Order in" },
  { category: "Football", question: "Home game or away game?", optionA: "Home game", optionB: "Away game" },
];

export type Keep3Drop2Prompt = { items: string[]; category: string; topic: string };
export const KEEP3_DROP2_PACK: Keep3Drop2Prompt[] = [
  {
    category: "Movies",
    topic: "You can only keep 3 genres",
    items: ["Comedy", "Action", "Romance", "Horror", "Drama"],
  },
];

export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
