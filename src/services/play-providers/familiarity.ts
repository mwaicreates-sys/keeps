import { createClient } from "@/lib/supabase/server";
import type { PlayItem } from "@/services/play-providers/types";

/**
 * Familiarity/relevance scoring for the round generator.
 *
 * Product rule: Keeps Play should optimize for content the players are
 * likely to recognize and have an opinion about -- not the freshest or
 * most obscure thing a provider can return. This module turns a space's
 * own history (dropped songs, favorites, and how people have actually
 * responded to past rounds) into a score that ranks candidates before
 * they're selected into a round.
 *
 * Deliberately simple: two lookups (a name set, an id->weight map) and
 * a weighted sum. No ML, no per-user split beyond what the schema
 * already gives us for free -- a 2-person space's dropped content and
 * game history are inherently *shared* familiarity, which is exactly
 * the signal the product spec asks to prioritize first.
 */

export type FamiliarityProfile = {
  /** Normalized (lowercased, trimmed) artist/album/song names the space
   * already knows -- from dropped songs and favorites. Matching against
   * this is inherently fuzzy (free-text names, no external ids), which
   * is fine: it's a familiarity *boost*, not a gate. */
  familiarNames: Set<string>;
  /** Real provider item ids (MBIDs) -> accumulated signal weight, from
   * play_item_signals. Exact-match, since these ids are stable. */
  itemSignalScores: Map<string, number>;
};

const EMPTY_PROFILE: FamiliarityProfile = { familiarNames: new Set(), itemSignalScores: new Map() };

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

/** Both players' dropped songs + favorites for this space, as a
 * normalized name set -- the highest-priority familiarity source per
 * the product spec ("Keeps itself: primary familiarity signal
 * source"). */
export async function getFamiliarityProfile(spaceId: string): Promise<FamiliarityProfile> {
  const supabase = await createClient();

  const [songsRes, favoritesRes, signalsRes] = await Promise.all([
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

  return { familiarNames, itemSignalScores };
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
 * have an opinion about it. */
export function scoreCandidate(item: Pick<PlayItem, "id" | "title" | "subtitle">, profile: FamiliarityProfile): number {
  let score = 0;
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
