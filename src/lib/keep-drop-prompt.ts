import { fetchContentPoolPrimed, prefetchContentPool, fetchSwapContentItem } from "@/services/content-pool-client";
import { CONTENT_CATEGORY, type ContentKind } from "@/lib/play-content-categories";
import { KEEP3_DROP2_PACK, randomFrom } from "@/lib/game-prompts";

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
  /** Which content kind this round used -- needed so a swap knows what
   * pool to request a replacement from, and so signals get recorded
   * against the right item type. */
  kind?: ContentKind;
};

export const KEEP_COUNT = 3;
export const KEEP_DROP_ROUND_SIZE = 5;
/** Requested pool size -- overfetched (not a literal 5) so there's room
 * to require every card to actually have a real image, instead of
 * accepting whatever the pool's own image-first (but not image-
 * required) ranking hands back. Exported so prefetch call sites warm
 * the exact same pool key this module consumes. */
export const KEEP_DROP_FETCH_SIZE = 8;
export const ALL_KINDS: readonly ContentKind[] = ["artist", "album", "track", "movie", "tv", "person"];

const TOPIC_BY_KIND: Record<ContentKind, string> = {
  artist: "Keep 3 artists",
  album: "Keep 3 albums",
  track: "Keep 3 songs",
  movie: "Keep 3 movies",
  tv: "Keep 3 shows",
  person: "Keep 3 actors",
};

/** Shared by the history view (starting the first round) and the round
 * view (starting the next one), so both pick content identically. */
export async function pickKeepDropPrompt(spaceId: string): Promise<{ prompt: KeepDropPrompt; topic: string }> {
  // Dynamic provider content is primary now -- every round tries a real
  // 5-item set first (kind picked at random for variety, across both
  // music and movies/TV), dropping to the hardcoded pack only when the
  // pool comes up short.
  const kind = ALL_KINDS[Math.floor(Math.random() * ALL_KINDS.length)];
  const pool = await fetchContentPoolPrimed(kind, KEEP_DROP_FETCH_SIZE, spaceId);
  const withImages = pool.items.filter((i) => i.imageUrl).slice(0, KEEP_DROP_ROUND_SIZE);

  if (withImages.length === KEEP_DROP_ROUND_SIZE) {
    const items = withImages.map((i) => i.title);
    return {
      prompt: {
        items,
        category: CONTENT_CATEGORY[kind],
        images: Object.fromEntries(withImages.map((i) => [i.title, i.imageUrl])),
        ids: Object.fromEntries(withImages.map((i) => [i.title, i.id])),
        kind,
      },
      topic: TOPIC_BY_KIND[kind],
    };
  }
  const p = randomFrom(KEEP3_DROP2_PACK);
  return { prompt: { items: p.items, category: p.category }, topic: p.topic };
}

/** Fire off a prefetch for every kind so whichever one `pickKeepDropPrompt`
 * randomly picks next is already warm. */
export function warmAllKeepDropKinds(spaceId: string) {
  for (const k of ALL_KINDS) prefetchContentPool(k, KEEP_DROP_FETCH_SIZE, spaceId);
}

/** Fetch a single replacement item of the round's own kind, excluding
 * every id already in the round -- used by "Don't know this?" to swap
 * out one card without regenerating the whole round. */
export async function swapKeepDropItem(
  spaceId: string,
  kind: ContentKind,
  currentIds: string[]
): Promise<{ title: string; id: string; imageUrl: string | null } | null> {
  const replacement = await fetchSwapContentItem(kind, spaceId, currentIds);
  return replacement ? { title: replacement.title, id: replacement.id, imageUrl: replacement.imageUrl } : null;
}
