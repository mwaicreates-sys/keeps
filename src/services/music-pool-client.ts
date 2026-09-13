"use client";

import type { PlayPool } from "@/services/play-providers/types";

type Kind = "artist" | "album" | "track";

/** Calls Keeps' own /api/play/music-pool -- never Spotify/MusicBrainz
 * directly, and no credentials ever reach the browser. Always resolves
 * (never throws); an empty pool just means the caller should fall back
 * to its own local content. `excludeIds` additionally excludes specific
 * item ids beyond recent history -- used by the "Don't know this" /
 * swap action so a just-rejected item can't come right back. */
export async function fetchMusicPool(kind: Kind, count: number, spaceId: string, excludeIds?: string[]): Promise<PlayPool> {
  try {
    const params = new URLSearchParams({ kind, count: String(count), spaceId });
    if (excludeIds?.length) params.set("excludeIds", excludeIds.join(","));
    const res = await fetch(`/api/play/music-pool?${params.toString()}`);
    if (!res.ok) return { items: [], provider: "none" };
    return (await res.json()) as PlayPool;
  } catch {
    return { items: [], provider: "none" };
  }
}

/** One-item replacement for the "Don't know this" / swap action --
 * fetches a single fresh item of the same kind, excluding everything
 * currently in the round so the swap can't just hand back the same
 * item (or another item already shown this round). */
export async function fetchSwapItem(kind: Kind, spaceId: string, excludeIds: string[]): Promise<PlayPool["items"][number] | null> {
  const pool = await fetchMusicPool(kind, 1, spaceId, excludeIds);
  return pool.items[0] ?? null;
}

/**
 * In-memory prefetch cache (per browser tab, cleared on reload) so a
 * game can kick off the *next* round's fetch while the player is still
 * looking at the current one -- by the time they tap "Next round" the
 * network request is already done or well underway, instead of starting
 * cold. Keyed by exactly what was requested, so a prefetch is only ever
 * consumed by a matching future request.
 */
const prefetchCache = new Map<string, Promise<PlayPool>>();

function poolKey(kind: Kind, count: number, spaceId: string): string {
  return `${kind}:${count}:${spaceId}`;
}

/** Fire-and-forget: start resolving the next round's pool now, stash the
 * promise for a later fetchMusicPoolPrimed() to pick up. Safe to call
 * repeatedly -- won't double-fetch the same key while one is in flight. */
export function prefetchMusicPool(kind: Kind, count: number, spaceId: string): void {
  const key = poolKey(kind, count, spaceId);
  if (!prefetchCache.has(key)) {
    prefetchCache.set(key, fetchMusicPool(kind, count, spaceId));
  }
}

/** Like fetchMusicPool, but consumes a matching prefetch if one is
 * already in flight/resolved instead of starting a fresh request. */
export async function fetchMusicPoolPrimed(kind: Kind, count: number, spaceId: string): Promise<PlayPool> {
  const key = poolKey(kind, count, spaceId);
  const primed = prefetchCache.get(key);
  if (primed) {
    prefetchCache.delete(key);
    return primed;
  }
  return fetchMusicPool(kind, count, spaceId);
}
