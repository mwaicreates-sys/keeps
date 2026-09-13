/**
 * Server-only TMDb client (only ever imported from Route Handlers/
 * server code, same convention as lib/musicbrainz/client.ts and
 * lib/supabase/server.ts -- never from a "use client" file).
 *
 * Auth: the v4 "API Read Access Token" as a Bearer token, per this
 * pass's explicit requirement -- never the v3 query-string API key,
 * and never sent from the browser. The browser only ever talks to
 * Keeps' own /api/play/movie-pool route; that route is the only place
 * this token is used.
 */
const READ_ACCESS_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN;
const BASE_URL = "https://api.themoviedb.org/3";
// Documented, stable CDN host -- doesn't require a live /configuration
// call to construct a valid image URL, though we still fetch and cache
// /configuration (see getTmdbImageConfig) so the real reported sizes
// and base are what's actually used, and so there's a live signal that
// credentials work.
const IMAGE_CDN_BASE = "https://image.tmdb.org/t/p";

export class TmdbConfigError extends Error {
  constructor() {
    super("TMDB_READ_ACCESS_TOKEN is not set");
    this.name = "TmdbConfigError";
  }
}

export class TmdbHttpError extends Error {
  status: number;
  constructor(status: number, path: string) {
    super(`TMDb ${path} -> ${status}`);
    this.name = "TmdbHttpError";
    this.status = status;
  }
}

export async function tmdbGet<T>(path: string, revalidateSeconds: number): Promise<T> {
  if (!READ_ACCESS_TOKEN) throw new TmdbConfigError();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${READ_ACCESS_TOKEN}`, Accept: "application/json" },
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) throw new TmdbHttpError(res.status, path);
  return (await res.json()) as T;
}

type TmdbImageConfig = { secure_base_url: string; poster_sizes: string[]; profile_sizes: string[] };

/** Fetched once and cached at module scope for the life of this warm
 * serverless instance (Next's own fetch cache also caches the raw
 * response for 30 days across instances) -- configuration essentially
 * never changes, so there's no need to hit it on every request. */
let cachedConfig: TmdbImageConfig | null = null;

export async function getTmdbImageConfig(): Promise<TmdbImageConfig> {
  if (cachedConfig) return cachedConfig;
  const data = await tmdbGet<{ images: TmdbImageConfig }>("/configuration", 60 * 60 * 24 * 30);
  cachedConfig = data.images;
  return cachedConfig;
}

/** Builds a real, appropriately-sized TMDb image URL -- never the
 * original/full-resolution file for a card that renders at ~180-300px.
 * `size` should be one of the tokens getTmdbImageConfig() reports
 * (e.g. "w342", "w500", "original"). */
export function tmdbImageUrl(path: string | null, size: string): string | null {
  if (!path) return null;
  return `${IMAGE_CDN_BASE}/${size}${path}`;
}

export function tmdbSourceUrl(itemType: "movie" | "tv" | "person", id: number | string): string {
  return `https://www.themoviedb.org/${itemType}/${id}`;
}
