"use client";

import type { TasteArtist } from "@/lib/play-taste";
import type { PlayItem } from "@/services/play-providers/types";

/** Fast, visual artist search for "Tune your Play" -- always resolves
 * (never throws); an empty result just means show nothing. Accepts an
 * AbortSignal so the caller can cancel a stale request the moment the
 * user types another character, instead of racing an old response
 * against a new one. */
export async function searchTasteArtists(query: string, signal?: AbortSignal): Promise<PlayItem[]> {
  try {
    const res = await fetch(`/api/play/artist-search?q=${encodeURIComponent(query)}`, { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: PlayItem[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export async function getTasteProfile(): Promise<{ artists: TasteArtist[]; genres: string[] }> {
  try {
    const res = await fetch("/api/play/taste-profile");
    if (!res.ok) return { artists: [], genres: [] };
    return (await res.json()) as { artists: TasteArtist[]; genres: string[] };
  } catch {
    return { artists: [], genres: [] };
  }
}

export async function saveTasteProfile(input: { artists: TasteArtist[]; genres: string[] }): Promise<boolean> {
  try {
    const res = await fetch("/api/play/taste-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.ok;
  } catch {
    return false;
  }
}
