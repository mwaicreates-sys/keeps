"use client";

import type { PlayPool } from "@/services/play-providers/types";

type Kind = "artist" | "album" | "track";

/** Calls Keeps' own /api/play/music-pool -- never Spotify/MusicBrainz
 * directly, and no credentials ever reach the browser. Always resolves
 * (never throws); an empty pool just means the caller should fall back
 * to its own local content. */
export async function fetchMusicPool(kind: Kind, count: number, spaceId: string): Promise<PlayPool> {
  try {
    const res = await fetch(`/api/play/music-pool?kind=${kind}&count=${count}&spaceId=${encodeURIComponent(spaceId)}`);
    if (!res.ok) return { items: [], provider: "none" };
    return (await res.json()) as PlayPool;
  } catch {
    return { items: [], provider: "none" };
  }
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
