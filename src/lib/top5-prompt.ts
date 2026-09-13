import { TOP5_PACK, randomFrom } from "@/lib/game-prompts";

export type Top5Prompt = { topic: string; category: string };

/** Shared by the launcher (starting the first round) and the round
 * view (starting the next one). Top 5 is free-text ranking, not
 * provider-backed content -- no images, no familiarity scoring, just a
 * topic prompt -- so this is a plain random pick, same as it always
 * was inside the old Top5Game component. */
export async function pickTop5Prompt(): Promise<Top5Prompt> {
  const p = randomFrom(TOP5_PACK);
  return { topic: p.topic, category: p.category };
}
