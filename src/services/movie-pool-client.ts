"use client";

import type { PlayPool } from "@/services/play-providers/types";

type Kind = "movie" | "tv" | "person";

/** Calls Keeps' own /api/play/movie-pool -- never TMDb directly, and
 * the TMDb Read Access Token never reaches the browser. Mirrors
 * music-pool-client.ts exactly (see there for the fuller rationale);
 * kept as a separate file/endpoint rather than merged into it, per
 * "do not alter the existing music provider architecture." */
export async function fetchMoviePool(kind: Kind, count: number, spaceId: string, excludeIds?: string[]): Promise<PlayPool> {
  try {
    const params = new URLSearchParams({ kind, count: String(count), spaceId });
    if (excludeIds?.length) params.set("excludeIds", excludeIds.join(","));
    const res = await fetch(`/api/play/movie-pool?${params.toString()}`);
    if (!res.ok) return { items: [], provider: "none" };
    return (await res.json()) as PlayPool;
  } catch {
    return { items: [], provider: "none" };
  }
}

export async function fetchSwapMovieItem(kind: Kind, spaceId: string, excludeIds: string[]): Promise<PlayPool["items"][number] | null> {
  const pool = await fetchMoviePool(kind, 1, spaceId, excludeIds);
  return pool.items[0] ?? null;
}

const prefetchCache = new Map<string, Promise<PlayPool>>();

function poolKey(kind: Kind, count: number, spaceId: string): string {
  return `${kind}:${count}:${spaceId}`;
}

export function prefetchMoviePool(kind: Kind, count: number, spaceId: string): void {
  const key = poolKey(kind, count, spaceId);
  if (!prefetchCache.has(key)) {
    prefetchCache.set(key, fetchMoviePool(kind, count, spaceId));
  }
}

export async function fetchMoviePoolPrimed(kind: Kind, count: number, spaceId: string): Promise<PlayPool> {
  const key = poolKey(kind, count, spaceId);
  const primed = prefetchCache.get(key);
  if (primed) {
    prefetchCache.delete(key);
    return primed;
  }
  return fetchMoviePool(kind, count, spaceId);
}
