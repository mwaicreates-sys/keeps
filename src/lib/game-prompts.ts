// Built-in prompt packs so Play works without any AI dependency.
// Categories: Music, Football, Movies, Games, Food, Places, Random,
// Internet culture, Preferences.

export type ThisOrThatPrompt = { optionA: string; optionB: string; category: string };
export const THIS_OR_THAT_PACK: ThisOrThatPrompt[] = [
  { category: "Music", optionA: "Studio album", optionB: "Live album" },
  { category: "Music", optionA: "Vinyl", optionB: "Streaming" },
  { category: "Football", optionA: "Messi", optionB: "Ronaldo" },
  { category: "Football", optionA: "Watch at the stadium", optionB: "Watch at home" },
  { category: "Movies", optionA: "Cinema", optionB: "Home cinema night" },
  { category: "Movies", optionA: "Marvel", optionB: "DC" },
  { category: "Games", optionA: "FIFA", optionB: "Call of Duty" },
  { category: "Food", optionA: "Pizza", optionB: "Burgers" },
  { category: "Food", optionA: "Sweet", optionB: "Savory" },
  { category: "Places", optionA: "Beach trip", optionB: "Mountain trip" },
  { category: "Random", optionA: "Morning person", optionB: "Night owl" },
  { category: "Random", optionA: "Texting", optionB: "Calling" },
  { category: "Internet culture", optionA: "TikTok", optionB: "Reels" },
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
  { category: "Random", question: "Beach or mountains?", optionA: "Beach", optionB: "Mountains" },
  { category: "Football", question: "Home game or away game?", optionA: "Home game", optionB: "Away game" },
];

export type Keep3Drop2Prompt = { items: string[]; category: string; topic: string };
export const KEEP3_DROP2_PACK: Keep3Drop2Prompt[] = [
  {
    category: "Movies",
    topic: "You can only keep 3 genres",
    items: ["Comedy", "Action", "Romance", "Horror", "Drama"],
  },
  {
    category: "Food",
    topic: "You can only keep 3 snacks forever",
    items: ["Chips", "Chocolate", "Fruit", "Nuts", "Ice cream"],
  },
];

export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
