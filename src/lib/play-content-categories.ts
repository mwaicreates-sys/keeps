import { MUSIC_CATEGORY } from "@/lib/play-music-categories";

/** Every kind This or That/Guess Mine/Blind Rank/Keep 3 Drop 2 can pull
 * from, across every content domain. Music kinds are untouched (kept
 * in their own file, per "do not alter the existing music provider
 * architecture") -- this just adds the TMDb ones alongside. */
export type ContentKind = "artist" | "album" | "track" | "movie" | "tv" | "person";

/** Same role MUSIC_CATEGORY plays for music: the session's `category`
 * column (used for duplicate-prevention lookups) and, for movie/tv/
 * person, the category pill shown on the round screen. */
export const MOVIE_CATEGORY: Record<"movie" | "tv" | "person", string> = {
  movie: "Movies & TV · Movies",
  tv: "Movies & TV · Shows",
  person: "Movies & TV · Actors",
};

export const CONTENT_CATEGORY: Record<ContentKind, string> = {
  ...MUSIC_CATEGORY,
  ...MOVIE_CATEGORY,
};

export function isMusicKind(kind: ContentKind): kind is "artist" | "album" | "track" {
  return kind === "artist" || kind === "album" || kind === "track";
}

/** Which provider actually produced an item of this kind -- used when
 * recording a familiarity signal so it's tagged honestly regardless of
 * which content domain the round happened to draw from. */
export function sourceForKind(kind: ContentKind): "musicbrainz" | "tmdb" {
  return isMusicKind(kind) ? "musicbrainz" : "tmdb";
}
