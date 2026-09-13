import { createClient } from "@/lib/supabase/server";
import { getArtistPlayItems, getAlbumPlayItems, getTrackPlayItems } from "@/services/play-providers/musicbrainz";
import { getKeepsMusicItems } from "@/services/play-providers/keeps-music";
import { getMoviePlayItems, getTvPlayItems, getPersonPlayItems } from "@/services/play-providers/tmdb";
import { getFamiliarityProfileSafe } from "@/services/play-providers/familiarity";
import { MUSIC_CATEGORY } from "@/lib/play-music-categories";
import { MOVIE_CATEGORY, isMusicKind, type ContentKind } from "@/lib/play-content-categories";
import type { PlayItem, PlayPool } from "@/services/play-providers/types";

/**
 * Server-only, in-process content pool resolution -- the same
 * provider/familiarity/exclusion logic /api/play/music-pool and
 * /api/play/movie-pool expose over HTTP, callable directly from other
 * server code (the daily-run generator, the run swap route) without an
 * actual network round trip.
 *
 * This distinction matters: music-pool-client.ts/movie-pool-client.ts
 * (the client-side equivalents these routes serve) call
 * fetch("/api/play/...") with a *relative* URL, which only resolves in
 * a browser. Calling those from server code doesn't error loudly --
 * fetch throws on the unparseable relative URL, but every pool-client
 * function catches that and quietly returns an empty pool -- so this
 * pool resolver is what actually keeps the daily-run generator honest:
 * without it, every run would have silently fallen back to the
 * hardcoded pack, every single time.
 *
 * Both HTTP routes below are now thin wrappers around these functions,
 * so there is exactly one implementation of "how a content pool gets
 * resolved," not two copies that could drift apart.
 */

async function getRecentlyUsedIds(spaceId: string, category: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("game_sessions")
    .select("prompt")
    .eq("space_id", spaceId)
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(15);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const items = (row.prompt as { items?: { id?: string }[] } | null)?.items ?? [];
    for (const item of items) if (item?.id) ids.add(item.id);
  }
  return ids;
}

type MusicKind = "artist" | "album" | "track";

async function fetchMusicByKind(kind: MusicKind, count: number, exclude: Set<string>, profile: Awaited<ReturnType<typeof getFamiliarityProfileSafe>>) {
  if (kind === "artist") return getArtistPlayItems(count, exclude, profile);
  if (kind === "album") return getAlbumPlayItems(count, exclude, profile);
  return getTrackPlayItems(count, exclude, profile);
}

export async function resolveMusicPool(kind: MusicKind, count: number, spaceId: string, excludeIds?: string[]): Promise<PlayPool> {
  const start = Date.now();
  const [historyExclude, profile] = await Promise.all([
    getRecentlyUsedIds(spaceId, MUSIC_CATEGORY[kind]).catch(() => new Set<string>()),
    getFamiliarityProfileSafe(spaceId),
  ]);
  const exclude = new Set(historyExclude);
  for (const id of excludeIds ?? []) exclude.add(id);

  const { items: liveItems, listenBrainzFailed, musicBrainzFailed } = await fetchMusicByKind(kind, count, exclude, profile);
  const items: PlayItem[] = [...liveItems];
  const satisfiedByLiveProviders = items.length >= count;
  const liveItemCount = items.length;

  if (items.length < count) {
    const have = new Set(items.map((i) => i.title.toLowerCase()));
    const topUp = await getKeepsMusicItems(spaceId, kind, count - items.length + have.size).catch(() => []);
    for (const item of topUp) {
      if (items.length >= count) break;
      if (have.has(item.title.toLowerCase())) continue;
      have.add(item.title.toLowerCase());
      items.push(item);
    }
  }

  const provider = satisfiedByLiveProviders ? "musicbrainz" : items.length >= count ? "keeps_music" : "keeps_picks";
  console.log(
    "[play/music-pool]",
    JSON.stringify({
      requestedKind: kind,
      requestedCount: count,
      providerUsed: provider,
      liveItemCount,
      finalItemCount: items.length,
      listenBrainzFailed,
      musicBrainzFailed,
      durationMs: Date.now() - start,
    })
  );

  return { items, provider };
}

type MovieKind = "movie" | "tv" | "person";

async function fetchMovieByKind(kind: MovieKind, count: number, exclude: Set<string>, profile: Awaited<ReturnType<typeof getFamiliarityProfileSafe>>) {
  if (kind === "movie") return getMoviePlayItems(count, exclude, profile);
  if (kind === "tv") return getTvPlayItems(count, exclude, profile);
  return getPersonPlayItems(count, exclude, profile);
}

export async function resolveMoviePool(kind: MovieKind, count: number, spaceId: string, excludeIds?: string[]): Promise<PlayPool> {
  const start = Date.now();
  const [historyExclude, profile] = await Promise.all([
    getRecentlyUsedIds(spaceId, MOVIE_CATEGORY[kind]).catch(() => new Set<string>()),
    getFamiliarityProfileSafe(spaceId),
  ]);
  const exclude = new Set(historyExclude);
  for (const id of excludeIds ?? []) exclude.add(id);

  const { items, failed, diagnostics } = await fetchMovieByKind(kind, count, exclude, profile);
  const provider = items.length >= count ? "tmdb" : "tmdb_partial";

  console.log(
    "[play/movie-pool]",
    JSON.stringify({
      requestedKind: kind,
      requestedCount: count,
      providerUsed: provider,
      tmdbHttpStatus: diagnostics.httpStatus,
      candidateCount: diagnostics.candidateCount,
      rejectedForNoImage: diagnostics.rejectedForNoImage,
      rejectedForRecognizability: diagnostics.rejectedForRecognizability,
      finalItemCount: items.length,
      failed,
      durationMs: Date.now() - start,
    })
  );

  return { items, provider };
}

/** Single dispatcher across every content kind (music + movie/TV/
 * person) -- what the daily-run generator and the run swap route
 * actually call, so they never have to know which underlying provider
 * serves a given kind. */
export async function resolveContentPool(kind: ContentKind, count: number, spaceId: string, excludeIds?: string[]): Promise<PlayPool> {
  return isMusicKind(kind) ? resolveMusicPool(kind, count, spaceId, excludeIds) : resolveMoviePool(kind, count, spaceId, excludeIds);
}
