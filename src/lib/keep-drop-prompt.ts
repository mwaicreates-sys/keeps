import { fetchMusicPoolPrimed, prefetchMusicPool, fetchSwapItem } from "@/services/music-pool-client";
import { MUSIC_CATEGORY } from "@/lib/play-music-categories";
import { KEEP3_DROP2_PACK, randomFrom } from "@/lib/game-prompts";

export type MusicKind = "artist" | "album" | "track";

export type KeepDropPrompt = {
  items: string[];
  category: string;
  /** Only present for a real, provider-backed set -- looked up by item
   * title so the existing string-keyed kept/result logic never changes
   * shape. */
  images?: Record<string, string | null>;
  /** Real provider item ids, keyed by title -- only present alongside
   * `images`. Lets the "Don't know this" swap exclude the right item
   * and record a familiarity signal against its real id. */
  ids?: Record<string, string>;
  /** Which music kind this round used -- needed so a swap knows what
   * to request a replacement of. */
  kind?: MusicKind;
};

export const KEEP_COUNT = 3;
export const KEEP_DROP_ROUND_SIZE = 5;
export const MUSIC_KINDS: readonly MusicKind[] = ["artist", "album", "track"];

/** Shared by the history view (starting the first round) and the round
 * view (starting the next one), so both pick content identically. */
export async function pickKeepDropPrompt(spaceId: string): Promise<{ prompt: KeepDropPrompt; topic: string }> {
  // Dynamic provider content is primary now -- every round tries a real
  // 5-item set first (kind picked at random for variety), dropping to
  // the hardcoded pack only when the pool comes up short.
  const kind = MUSIC_KINDS[Math.floor(Math.random() * MUSIC_KINDS.length)];
  const pool = await fetchMusicPoolPrimed(kind, KEEP_DROP_ROUND_SIZE, spaceId);

  if (pool.items.length === KEEP_DROP_ROUND_SIZE) {
    const items = pool.items.map((i) => i.title);
    return {
      prompt: {
        items,
        category: MUSIC_CATEGORY[kind],
        images: Object.fromEntries(pool.items.map((i) => [i.title, i.imageUrl])),
        ids: Object.fromEntries(pool.items.map((i) => [i.title, i.id])),
        kind,
      },
      topic: `Keep 3 ${kind === "artist" ? "artists" : kind === "album" ? "albums" : "songs"}`,
    };
  }
  const p = randomFrom(KEEP3_DROP2_PACK);
  return { prompt: { items: p.items, category: p.category }, topic: p.topic };
}

/** Fire off a prefetch for every music kind so whichever one `pickKeepDropPrompt`
 * randomly picks next is already warm. */
export function warmAllKeepDropKinds(spaceId: string) {
  for (const k of MUSIC_KINDS) prefetchMusicPool(k, KEEP_DROP_ROUND_SIZE, spaceId);
}

/** Fetch a single replacement item of the round's own kind, excluding
 * every id already in the round -- used by "Don't know this?" to swap
 * out one card without regenerating the whole round. */
export async function swapKeepDropItem(
  spaceId: string,
  kind: MusicKind,
  currentIds: string[]
): Promise<{ title: string; id: string; imageUrl: string | null } | null> {
  const replacement = await fetchSwapItem(kind, spaceId, currentIds);
  return replacement ? { title: replacement.title, id: replacement.id, imageUrl: replacement.imageUrl } : null;
}
