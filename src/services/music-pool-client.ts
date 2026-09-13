"use client";

import type { PlayPool } from "@/services/play-providers/types";

/** Calls Keeps' own /api/play/music-pool -- never Spotify/MusicBrainz
 * directly, and no credentials ever reach the browser. Always resolves
 * (never throws); an empty pool just means the caller should fall back
 * to its own local content. */
export async function fetchMusicPool(kind: "artist" | "album" | "track", count: number, spaceId: string): Promise<PlayPool> {
  try {
    const res = await fetch(`/api/play/music-pool?kind=${kind}&count=${count}&spaceId=${encodeURIComponent(spaceId)}`);
    if (!res.ok) return { items: [], provider: "none" };
    return (await res.json()) as PlayPool;
  } catch {
    return { items: [], provider: "none" };
  }
}
