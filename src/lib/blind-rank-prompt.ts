import { fetchContentPoolPrimed, prefetchContentPool, fetchSwapContentItem } from "@/services/content-pool-client";
import { CONTENT_CATEGORY, type ContentKind } from "@/lib/play-content-categories";
import { BLIND_RANK_PACK, randomFrom } from "@/lib/game-prompts";

export type BlindRankPrompt = {
  items: string[];
  category: string;
  /** Only present for a real, provider-backed set (e.g. 5 albums or 5
   * movie posters) -- looked up by item title so the string-keyed
   * ranking/result logic never has to change shape. */
  images?: Record<string, string | null>;
  /** Real provider item ids, keyed by title -- only present alongside
   * `images`. Lets the "Don't know this" swap exclude the right item
   * and record a familiarity signal against its real id. */
  ids?: Record<string, string>;
  /** Which content kind this round used -- lets the round screen
   * record signals against the right item type/source and know which
   * pool a swap replacement should come from. */
  kind?: ContentKind;
};

export const BLIND_RANK_ROUND_SIZE = 5;
/** Requested pool size -- overfetched (not a literal 5) so there's room
 * to require every ranked item to actually have a real cover, instead
 * of accepting whatever the pool's own image-first (but not image-
 * required) ranking hands back. Exported so prefetch call sites warm
 * the exact same pool key this module consumes. */
export const BLIND_RANK_FETCH_SIZE = 8;

/** Blind Rank draws from albums (music) or posters (movies/TV) -- one
 * kind at a time, ranked one card at a time, per the visual-quiz rule. */
const BLIND_RANK_KINDS: ContentKind[] = ["album", "movie", "tv", "person"];

const TOPIC_BY_KIND: Record<ContentKind, string> = {
  artist: "Rank these artists",
  album: "Rank these albums",
  track: "Rank these songs",
  movie: "Rank these movies",
  tv: "Rank these shows",
  person: "Rank these actors",
};

/** Shared by the history view (starting the first round) and the round
 * view (starting the next one), so both pick content identically. */
export async function pickBlindRankPrompt(spaceId: string): Promise<{ prompt: BlindRankPrompt; topic: string }> {
  const kind = BLIND_RANK_KINDS[Math.floor(Math.random() * BLIND_RANK_KINDS.length)];
  const pool = await fetchContentPoolPrimed(kind, BLIND_RANK_FETCH_SIZE, spaceId);
  const withImages = pool.items.filter((i) => i.imageUrl).slice(0, BLIND_RANK_ROUND_SIZE);
  if (withImages.length === BLIND_RANK_ROUND_SIZE) {
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
  const p = randomFrom(BLIND_RANK_PACK);
  return { prompt: { items: p.items, category: p.category }, topic: p.topic };
}

/** Warms every kind pickBlindRankPrompt might randomly draw from, so
 * whichever one it actually picks next is already warm. */
export function warmAllBlindRankKinds(spaceId: string): void {
  for (const kind of BLIND_RANK_KINDS) prefetchContentPool(kind, BLIND_RANK_FETCH_SIZE, spaceId);
}

/** Fetch a single replacement item of the round's own kind, excluding
 * every id already in this round -- used by "Don't know this?" to swap
 * out one item without regenerating the whole round. Returns null if
 * no provider item is available (round stays as-is; nothing to swap
 * in). */
export async function swapBlindRankItem(
  spaceId: string,
  kind: ContentKind,
  currentIds: string[]
): Promise<{ title: string; id: string; imageUrl: string | null } | null> {
  const replacement = await fetchSwapContentItem(kind, spaceId, currentIds);
  return replacement ? { title: replacement.title, id: replacement.id, imageUrl: replacement.imageUrl } : null;
}
