import { createClient } from "@/lib/supabase/server";
import { MAINSTREAM_ARTIST_SEEDS } from "@/lib/mainstream-artist-seeds";
import type { PlayItem } from "@/services/play-providers/types";

/**
 * Familiarity/relevance scoring for the round generator.
 *
 * Product rule: Keeps Play should optimize for content the players are
 * likely to recognize and have an opinion about -- not the freshest or
 * most obscure thing a provider can return. This module turns a space's
 * own signal (an explicit "Tune your Play" taste seed when one exists,
 * dropped songs, favorites, and how people have actually responded to
 * past rounds) into a score that ranks candidates before they're
 * selected into a round.
 *
 * Deliberately simple: a handful of lookups feeding one weighted sum.
 * No ML, no per-user split beyond what the schema already gives us for
 * free -- a 2-person space's dropped content, taste seed and game
 * history are inherently *shared* familiarity, which is exactly the
 * signal the product spec asks to prioritize first.
 */

export type FamiliarityProfile = {
  /** Normalized (lowercased, trimmed) artist/album/song names the space
   * already knows -- from dropped songs, favorites, and (only when
   * there is otherwise zero signal at all) a mainstream cold-start
   * seed. Matching against this is inherently fuzzy (free-text names,
   * no external ids), which is fine: it's a familiarity *boost*, not a
   * gate. */
  familiarNames: Set<string>;
  /** Real provider item ids (MBIDs) -> accumulated signal weight, from
   * play_item_signals. Exact-match, since these ids are stable. */
  itemSignalScores: Map<string, number>;
  /** MBIDs the user(s) explicitly picked in "Tune your Play" -- the
   * strongest signal there is, per the product spec ("selected taste
   * seed" is priority #1). Combined across both space members, since a
   * 2-person space's combined taste graph is exactly what shared games
   * should prefer. */
  tasteArtistIds: Set<string>;
  /** Same taste-seed artists, by normalized name -- lets an *album or
   * track* by a seeded artist also get a strong (if slightly lower)
   * boost, since the item's own id won't match an artist mbid. */
  tasteArtistNames: Set<string>;
  /** Normalized genre/tag chips picked in the optional second Tune
   * step, if any -- used to bias which genre a search fallback reaches
   * for for this space, not (yet) to filter by per-item tags, since
   * that would cost an extra MusicBrainz call per candidate. */
  tasteGenres: Set<string>;
};

const EMPTY_PROFILE: FamiliarityProfile = {
  familiarNames: new Set(),
  itemSignalScores: new Map(),
  tasteArtistIds: new Set(),
  tasteArtistNames: new Set(),
  tasteGenres: new Set(),
};

export function normalizeName(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

// Positive signals move a candidate up; negative ones ("Don't know",
// skip, repeated non-response) push it down and, over time, out of
// rotation entirely. Selection/kept/ranked count more as *engagement*
// evidence (proves familiarity) than as a statement of taste -- see the
// product spec's "selection proves familiarity more than preference".
const SIGNAL_WEIGHT: Record<string, number> = {
  dropped_in_keeps: 6,
  favorite: 5,
  kept: 3,
  ranked: 2,
  selected: 2,
  seen: 0.5,
  swapped: -4,
  unknown: -5,
  skipped: -2,
};

export function weightForSignal(signalType: string): number {
  return SIGNAL_WEIGHT[signalType] ?? 0;
}

type TasteArtistEntry = { mbid?: string; name?: string };

/** Both players' dropped songs + favorites + "Tune your Play" taste
 * seed for this space, as familiarity lookups -- the highest-priority
 * familiarity sources per the product spec ("selected taste seed" is
 * priority #1, "Keeps itself" is priority #2/#3). */
export async function getFamiliarityProfile(spaceId: string): Promise<FamiliarityProfile> {
  const supabase = await createClient();

  const [songsRes, favoritesRes, signalsRes, tasteRes] = await Promise.all([
    supabase
      .from("posts")
      .select("post_song_metadata!inner(artist, album)")
      .eq("space_id", spaceId)
      .limit(200),
    supabase.from("favorites").select("item_name").eq("space_id", spaceId).limit(200),
    supabase
      .from("play_item_signals")
      .select("item_id, weight")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("play_taste_profiles").select("music_artist_ids, music_genres").eq("space_id", spaceId),
  ]);

  const familiarNames = new Set<string>();
  for (const row of (songsRes.data ?? []) as unknown as { post_song_metadata: { artist: string | null; album: string | null } }[]) {
    if (row.post_song_metadata.artist) familiarNames.add(normalizeName(row.post_song_metadata.artist));
    if (row.post_song_metadata.album) familiarNames.add(normalizeName(row.post_song_metadata.album));
  }
  for (const row of (favoritesRes.data ?? []) as unknown as { item_name: string }[]) {
    familiarNames.add(normalizeName(row.item_name));
  }

  const itemSignalScores = new Map<string, number>();
  for (const row of (signalsRes.data ?? []) as unknown as { item_id: string; weight: number }[]) {
    itemSignalScores.set(row.item_id, (itemSignalScores.get(row.item_id) ?? 0) + Number(row.weight));
  }

  const tasteArtistIds = new Set<string>();
  const tasteArtistNames = new Set<string>();
  const tasteGenres = new Set<string>();
  for (const row of (tasteRes.data ?? []) as unknown as { music_artist_ids: unknown; music_genres: string[] | null }[]) {
    const artists = Array.isArray(row.music_artist_ids) ? (row.music_artist_ids as TasteArtistEntry[]) : [];
    for (const a of artists) {
      if (a.mbid) tasteArtistIds.add(a.mbid);
      if (a.name) tasteArtistNames.add(normalizeName(a.name));
    }
    for (const g of row.music_genres ?? []) tasteGenres.add(normalizeName(g));
  }

  // True cold start: nothing dropped, nothing favorited, no taste seed,
  // no gameplay history yet. Per the product spec, the *default*
  // shouldn't be "whatever a random genre tag search turns up" -- seed
  // recognizability with a curated mainstream list until real signal
  // exists, same as a real user would expect from a brand-new account.
  if (familiarNames.size === 0 && tasteArtistIds.size === 0 && itemSignalScores.size === 0) {
    for (const name of MAINSTREAM_ARTIST_SEEDS) familiarNames.add(normalizeName(name));
  }

  return { familiarNames, itemSignalScores, tasteArtistIds, tasteArtistNames, tasteGenres };
}

/** Never let a familiarity lookup failure break a round -- fall back to
 * an empty profile (pure popularity/discovery ordering) rather than
 * throwing. */
export async function getFamiliarityProfileSafe(spaceId: string): Promise<FamiliarityProfile> {
  try {
    return await getFamiliarityProfile(spaceId);
  } catch {
    return EMPTY_PROFILE;
  }
}

/** Score one candidate. Higher = more likely the players recognize and
 * have an opinion about it. Ordered roughly per the spec's own weight
 * table: a directly-seeded artist scores far above an album/track by
 * one, which in turn scores above a Keeps-dropped name match. */
export function scoreCandidate(item: Pick<PlayItem, "id" | "title" | "subtitle">, profile: FamiliarityProfile): number {
  let score = 0;
  if (profile.tasteArtistIds.has(item.id)) score += 40;
  if (profile.tasteArtistNames.has(normalizeName(item.title))) score += 30;
  if (item.subtitle && profile.tasteArtistNames.has(normalizeName(item.subtitle))) score += 25;
  if (profile.familiarNames.has(normalizeName(item.title))) score += 10;
  if (item.subtitle && profile.familiarNames.has(normalizeName(item.subtitle))) score += 7;
  score += profile.itemSignalScores.get(item.id) ?? 0;
  // Small jitter so ties don't always resolve the same way round after
  // round -- variety without abandoning the ranking.
  score += Math.random() * 1.5;
  return score;
}

/**
 * Rank candidates highest-familiarity-first, but reserve one slot for
 * occasional discovery (a lower-scored item) once there's room for it --
 * "BALANCED" mode: mostly familiar/relevant, a little fresh. This is the
 * only mode implemented for now; FAMILIAR/WILD are a config change away
 * (just adjust how much of the tail gets used) but aren't exposed
 * anywhere yet, per the product spec's "don't force a setup form".
 */
export function rankByFamiliarity<T extends Pick<PlayItem, "id" | "title" | "subtitle">>(
  items: T[],
  profile: FamiliarityProfile,
  count: number
): T[] {
  if (items.length <= count) return items;

  const scored = items
    .map((item) => ({ item, score: scoreCandidate(item, profile) }))
    .sort((a, b) => b.score - a.score);

  if (count <= 1) return scored.slice(0, count).map((s) => s.item);

  const familiarSlots = count - 1;
  const top = scored.slice(0, familiarSlots).map((s) => s.item);
  const rest = scored.slice(familiarSlots);
  const discoveryPick = rest[Math.floor(Math.random() * rest.length)]?.item;
  return discoveryPick ? [...top, discoveryPick] : top;
}

/** Pick a genre/tag to seed a search-fallback query with -- prefers the
 * space's own "Tune your Play" genre chips when any exist, otherwise
 * falls back to the caller's own default rotation. Keeps the "search
 * fallback should lean toward what this space is actually into" rule
 * without adding a second, separate genre-matching pass per candidate. */
export function pickSeedGenre(profile: FamiliarityProfile, fallbackSeeds: readonly string[]): string {
  if (profile.tasteGenres.size > 0) {
    const genres = [...profile.tasteGenres];
    return genres[Math.floor(Math.random() * genres.length)];
  }
  return fallbackSeeds[Math.floor(Math.random() * fallbackSeeds.length)];
}
