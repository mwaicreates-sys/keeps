"use client";

import { fetchMusicPool, fetchMusicPoolPrimed, prefetchMusicPool, fetchSwapItem as fetchSwapMusicItem } from "@/services/music-pool-client";
import { fetchMoviePool, fetchMoviePoolPrimed, prefetchMoviePool, fetchSwapMovieItem } from "@/services/movie-pool-client";
import { isMusicKind, type ContentKind } from "@/lib/play-content-categories";
import type { PlayPool } from "@/services/play-providers/types";

/**
 * Thin dispatcher so This or That/Guess Mine/Blind Rank/Keep 3 Drop 2
 * can pick a `kind` from across every content domain (music or movies/
 * TV) without knowing which underlying pool/endpoint serves it. Neither
 * music-pool-client.ts nor movie-pool-client.ts is modified -- this
 * just routes to whichever one already exists.
 */
export async function fetchContentPool(kind: ContentKind, count: number, spaceId: string, excludeIds?: string[]): Promise<PlayPool> {
  return isMusicKind(kind) ? fetchMusicPool(kind, count, spaceId, excludeIds) : fetchMoviePool(kind, count, spaceId, excludeIds);
}

export function prefetchContentPool(kind: ContentKind, count: number, spaceId: string): void {
  if (isMusicKind(kind)) prefetchMusicPool(kind, count, spaceId);
  else prefetchMoviePool(kind, count, spaceId);
}

export async function fetchContentPoolPrimed(kind: ContentKind, count: number, spaceId: string): Promise<PlayPool> {
  return isMusicKind(kind) ? fetchMusicPoolPrimed(kind, count, spaceId) : fetchMoviePoolPrimed(kind, count, spaceId);
}

export async function fetchSwapContentItem(kind: ContentKind, spaceId: string, excludeIds: string[]): Promise<PlayPool["items"][number] | null> {
  return isMusicKind(kind) ? fetchSwapMusicItem(kind, spaceId, excludeIds) : fetchSwapMovieItem(kind, spaceId, excludeIds);
}
