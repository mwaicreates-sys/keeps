import { tmdbGet, tmdbImageUrl, tmdbSourceUrl, TmdbHttpError, TmdbConfigError } from "@/lib/tmdb/client";
import { getCachedContentItem, setCachedContentItem } from "@/services/play-providers/content-cache";
import { rankByFamiliarity, type FamiliarityProfile } from "@/services/play-providers/familiarity";
import type { PlayItem } from "@/services/play-providers/types";

const NO_PROFILE: FamiliarityProfile = {
  familiarNames: new Set(),
  itemSignalScores: new Map(),
  tasteArtistIds: new Set(),
  tasteArtistNames: new Set(),
  tasteGenres: new Set(),
};

/**
 * TMDb provider -- movies, TV, and people (actors), normalized into the
 * same PlayItem shape every other provider returns. Per this pass's
 * explicit rule: TMDb popularity/discover data is a *candidate source
 * only*, never gameplay content on its own -- every discover query
 * below applies a hard recognizability floor (vote_count/vote_average
 * minimums) before familiarity ranking ever runs, so "popular within
 * TMDb" and "actually recognizable to these two players" are treated
 * as two separate filters, same lesson as the music-provider pass.
 */
/** Temporary, verbose diagnostics for the TMDb live-verification pass --
 * every field the product audit asked for, so a server log line alone
 * (never the browser, never a secret) proves whether TMDb is actually
 * responding with real data or silently coming up empty. Cheap to leave
 * in; nothing here is PII or credentials. */
export type MovieFetchDiagnostics = {
  httpStatus: number | null;
  candidateCount: number;
  rejectedForNoImage: number;
  rejectedForRecognizability: number;
};
export type MovieFetchResult = { items: PlayItem[]; failed: boolean; diagnostics: MovieFetchDiagnostics };

const POSTER_SIZE = "w500"; // ~500px wide -- plenty for a card rendering at 180-300px, a fraction of the original file
const PROFILE_SIZE = "w342";
// Recognizability floor -- a candidate below this never enters the
// pool at all, regardless of what familiarity scoring would later do
// with it. Deliberately generous thresholds (well-known blockbusters
// and mainstream TV clear these easily); tune down only if production
// diagnostics show the pool coming up empty.
const MIN_VOTE_COUNT = 500;
const MIN_VOTE_AVERAGE = 5.5;

/** Best-effort HTTP status for the diagnostics log -- tmdbGet throws
 * before ever handing back a non-2xx response, so a successful call
 * only ever reaches here as "200"; a thrown TmdbHttpError carries the
 * real status, and a missing token surfaces as its own distinct code
 * (0) so "misconfigured" is never confused with "TMDb said no." */
function httpStatusFromError(err: unknown): number | null {
  if (err instanceof TmdbHttpError) return err.status;
  if (err instanceof TmdbConfigError) return 0;
  return null;
}

function randomPopularPage(): number {
  // Discover is sorted by popularity.desc; each page is 20 results, so
  // pages 1-5 stay within the ~top 100 most popular titles meeting the
  // recognizability floor -- variety without drifting into obscurity.
  return 1 + Math.floor(Math.random() * 5);
}

/** How many distinct discover pages to fetch for a given requested
 * count -- one page (20 raw results) comfortably covers a small ask
 * (e.g. Blind Rank/Keep 3 Drop 2's 8), but the daily-run choice
 * generator asks for a much bigger prepared pool (20-30) so it can
 * build several questions from one domain; a single page rarely
 * clears that bar once familiarity ranking and the (rare) missing-
 * poster case are applied. Capped at 2 -- bounded, not "fetch pages
 * until satisfied." */
function pagesNeededFor(count: number): number {
  return count > 15 ? 2 : 1;
}

function distinctRandomPages(n: number): number[] {
  const pages = new Set<number>();
  while (pages.size < n) pages.add(randomPopularPage());
  return [...pages];
}

type TmdbMovie = { id: number; title: string; poster_path: string | null; release_date?: string; vote_count: number; vote_average: number };
type TmdbTv = { id: number; name: string; poster_path: string | null; first_air_date?: string; vote_count: number; vote_average: number };
type TmdbPerson = { id: number; name: string; profile_path: string | null; known_for_department?: string; popularity: number };

/** The one place every movie/tv/person id gets turned into a real
 * PlayItem -- checks the persistent cache first (see
 * content-cache.ts), only ever calling this function's own resolution
 * logic on a miss, and writes the result back so a repeat appearance
 * of this title/person is a fast DB read next time, not a TMDb call. */
async function resolveVisual(
  itemType: "movie" | "tv" | "person",
  id: number,
  fallback: { title: string; subtitle: string | null; imagePath: string | null; metadata: Record<string, unknown> }
): Promise<PlayItem | null> {
  const idStr = String(id);
  const cached = await getCachedContentItem(itemType, idStr);
  if (cached) {
    if (!cached.imageUrl) return null; // cached "no usable image" -- replace this candidate, never render it
    return {
      id: idStr,
      type: itemType,
      title: cached.title ?? fallback.title,
      subtitle: cached.subtitle,
      imageUrl: cached.imageUrl,
      source: "tmdb",
      discoverySource: "tmdb",
      imageSource: "tmdb",
      sourceUrl: tmdbSourceUrl(itemType, id),
      metadata: cached.metadata,
    };
  }

  const imageUrl = fallback.imagePath ? tmdbImageUrl(fallback.imagePath, itemType === "person" ? PROFILE_SIZE : POSTER_SIZE) : null;
  await setCachedContentItem(itemType, idStr, { title: fallback.title, subtitle: fallback.subtitle, imageUrl, metadata: fallback.metadata });
  if (!imageUrl) return null; // no usable image -- caller replaces this candidate rather than showing a naked card

  return {
    id: idStr,
    type: itemType,
    title: fallback.title,
    subtitle: fallback.subtitle,
    imageUrl,
    source: "tmdb",
    discoverySource: "tmdb",
    imageSource: "tmdb",
    sourceUrl: tmdbSourceUrl(itemType, id),
    metadata: fallback.metadata,
  };
}

export async function getMoviePlayItems(count: number, exclude: Set<string> = new Set(), profile: FamiliarityProfile = NO_PROFILE): Promise<MovieFetchResult> {
  try {
    const pages = distinctRandomPages(pagesNeededFor(count));
    const responses = await Promise.all(
      pages.map((page) =>
        tmdbGet<{ results?: TmdbMovie[] }>(
          `/discover/movie?sort_by=popularity.desc&vote_count.gte=${MIN_VOTE_COUNT}&vote_average.gte=${MIN_VOTE_AVERAGE}&include_adult=false&page=${page}`,
          60 * 60 * 6
        )
      )
    );
    const seen = new Set<number>();
    const allResults: TmdbMovie[] = [];
    for (const data of responses) {
      for (const m of data.results ?? []) {
        if (seen.has(m.id)) continue; // dedupe across pages
        seen.add(m.id);
        allResults.push(m);
      }
    }
    const rawCount = allResults.length;
    // The recognizability floor (MIN_VOTE_COUNT/MIN_VOTE_AVERAGE) is a
    // TMDb *query* param, not a post-hoc filter -- every raw result here
    // already cleared it, so "rejected for recognizability" is 0 by
    // construction for this endpoint; the floor itself is what's doing
    // that rejection before this code ever sees a response.
    const candidates = allResults.filter((m) => m.poster_path && !exclude.has(String(m.id)));
    const rejectedForNoImageAtSource = rawCount - allResults.filter((m) => m.poster_path).length;
    // Overfetch beyond `count` before resolving/caching -- some
    // candidates will turn out to have no cached-usable image (rare,
    // since we already filtered on poster_path, but the cache can carry
    // a stale "no image" verdict) or get excluded by familiarity noise.
    const ranked = rankByFamiliarity(
      candidates.map((m) => ({ id: String(m.id), title: m.title, subtitle: m.release_date?.slice(0, 4) ?? null })),
      profile,
      Math.min(candidates.length, count + 4)
    ).map((r) => candidates.find((c) => String(c.id) === r.id)!);

    const resolved = await Promise.all(
      ranked.map((m) =>
        resolveVisual("movie", m.id, {
          title: m.title,
          subtitle: m.release_date?.slice(0, 4) ?? null,
          imagePath: m.poster_path,
          metadata: { posterPath: m.poster_path, releaseDate: m.release_date ?? null, voteAverage: m.vote_average },
        })
      )
    );
    const items = resolved.filter((i): i is PlayItem => i !== null).slice(0, count);
    const rejectedForNoImage = rejectedForNoImageAtSource + (resolved.length - items.length);
    return { items, failed: false, diagnostics: { httpStatus: 200, candidateCount: rawCount, rejectedForNoImage, rejectedForRecognizability: 0 } };
  } catch (err) {
    return { items: [], failed: true, diagnostics: { httpStatus: httpStatusFromError(err), candidateCount: 0, rejectedForNoImage: 0, rejectedForRecognizability: 0 } };
  }
}

export async function getTvPlayItems(count: number, exclude: Set<string> = new Set(), profile: FamiliarityProfile = NO_PROFILE): Promise<MovieFetchResult> {
  try {
    const pages = distinctRandomPages(pagesNeededFor(count));
    const responses = await Promise.all(
      pages.map((page) =>
        tmdbGet<{ results?: TmdbTv[] }>(
          `/discover/tv?sort_by=popularity.desc&vote_count.gte=${MIN_VOTE_COUNT}&vote_average.gte=${MIN_VOTE_AVERAGE}&include_adult=false&page=${page}`,
          60 * 60 * 6
        )
      )
    );
    const seen = new Set<number>();
    const allResults: TmdbTv[] = [];
    for (const data of responses) {
      for (const t of data.results ?? []) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        allResults.push(t);
      }
    }
    const rawCount = allResults.length;
    const candidates = allResults.filter((t) => t.poster_path && !exclude.has(String(t.id)));
    const rejectedForNoImageAtSource = rawCount - allResults.filter((t) => t.poster_path).length;
    const ranked = rankByFamiliarity(
      candidates.map((t) => ({ id: String(t.id), title: t.name, subtitle: t.first_air_date?.slice(0, 4) ?? null })),
      profile,
      Math.min(candidates.length, count + 4)
    ).map((r) => candidates.find((c) => String(c.id) === r.id)!);

    const resolved = await Promise.all(
      ranked.map((t) =>
        resolveVisual("tv", t.id, {
          title: t.name,
          subtitle: t.first_air_date?.slice(0, 4) ?? null,
          imagePath: t.poster_path,
          metadata: { posterPath: t.poster_path, firstAirDate: t.first_air_date ?? null, voteAverage: t.vote_average },
        })
      )
    );
    const items = resolved.filter((i): i is PlayItem => i !== null).slice(0, count);
    const rejectedForNoImage = rejectedForNoImageAtSource + (resolved.length - items.length);
    return { items, failed: false, diagnostics: { httpStatus: 200, candidateCount: rawCount, rejectedForNoImage, rejectedForRecognizability: 0 } };
  } catch (err) {
    return { items: [], failed: true, diagnostics: { httpStatus: httpStatusFromError(err), candidateCount: 0, rejectedForNoImage: 0, rejectedForRecognizability: 0 } };
  }
}

export async function getPersonPlayItems(count: number, exclude: Set<string> = new Set(), profile: FamiliarityProfile = NO_PROFILE): Promise<MovieFetchResult> {
  try {
    // /person/popular is a much smaller, curated-feeling list than
    // discover -- still fetch a second page for a big pool request,
    // since a meaningful slice of each page lacks a usable profile
    // photo or isn't an actor.
    const pageCount = pagesNeededFor(count);
    const pages = new Set<number>();
    while (pages.size < pageCount) pages.add(1 + Math.floor(Math.random() * 3));
    const responses = await Promise.all([...pages].map((page) => tmdbGet<{ results?: TmdbPerson[] }>(`/person/popular?page=${page}`, 60 * 60 * 6)));
    const seen = new Set<number>();
    const allResults: TmdbPerson[] = [];
    for (const data of responses) {
      for (const p of data.results ?? []) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        allResults.push(p);
      }
    }
    const rawCount = allResults.length;
    const withImageField = allResults.filter((p) => p.profile_path);
    const rejectedForRecognizability = withImageField.filter((p) => p.known_for_department !== "Acting").length;
    const rejectedForNoImageAtSource = rawCount - withImageField.length;
    const candidates = allResults.filter((p) => p.profile_path && p.known_for_department === "Acting" && !exclude.has(String(p.id)));
    const ranked = rankByFamiliarity(
      candidates.map((p) => ({ id: String(p.id), title: p.name, subtitle: null })),
      profile,
      Math.min(candidates.length, count + 4)
    ).map((r) => candidates.find((c) => String(c.id) === r.id)!);

    const resolved = await Promise.all(
      ranked.map((p) =>
        resolveVisual("person", p.id, {
          title: p.name,
          subtitle: "Actor",
          imagePath: p.profile_path,
          metadata: { profilePath: p.profile_path },
        })
      )
    );
    const items = resolved.filter((i): i is PlayItem => i !== null).slice(0, count);
    const rejectedForNoImage = rejectedForNoImageAtSource + (resolved.length - items.length);
    return { items, failed: false, diagnostics: { httpStatus: 200, candidateCount: rawCount, rejectedForNoImage, rejectedForRecognizability } };
  } catch (err) {
    return { items: [], failed: true, diagnostics: { httpStatus: httpStatusFromError(err), candidateCount: 0, rejectedForNoImage: 0, rejectedForRecognizability: 0 } };
  }
}
