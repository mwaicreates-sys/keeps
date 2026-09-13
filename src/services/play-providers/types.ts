/**
 * The normalized shape every Play content provider (MusicBrainz today;
 * TMDb/sports/Keeps-memories later) returns, so game components consume
 * one consistent item type and never need to know which provider or API
 * produced it.
 */
export type PlayItemType = "artist" | "album" | "track" | "movie" | "show" | "team" | "place" | "memory" | "favorite";

export type PlayItem = {
  id: string;
  type: PlayItemType;
  title: string;
  subtitle?: string | null;
  imageUrl: string | null;
  source: string;
  sourceUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export type PlayPool = {
  items: PlayItem[];
  /** Which provider actually satisfied the request -- lets the caller/UI
   * know if it fell back (e.g. "musicbrainz" vs "keeps-picks"). */
  provider: string;
};
