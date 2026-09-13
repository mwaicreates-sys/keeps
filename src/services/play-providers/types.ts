/**
 * The normalized shape every Play content provider (MusicBrainz/
 * ListenBrainz today; TMDb/sports/Keeps-memories later) returns, so game
 * components consume one consistent item type and never need to know
 * which provider or API produced it.
 */
export type PlayItemType = "artist" | "album" | "track" | "movie" | "show" | "tv" | "person" | "team" | "place" | "memory" | "favorite";

export type PlayItem = {
  id: string;
  type: PlayItemType;
  title: string;
  subtitle?: string | null;
  imageUrl: string | null;
  /** Where the item's core metadata came from: "musicbrainz" |
   * "keeps_music" | "keeps_picks". */
  source: string;
  /** What surfaced this particular item -- may differ from `source`.
   * E.g. a ListenBrainz fresh-release pick still has its metadata
   * confirmed via MusicBrainz, so source="musicbrainz" but
   * discoverySource="listenbrainz". */
  discoverySource?: string;
  /** Where imageUrl was resolved from: "wikimedia" | "coverartarchive" |
   * "keeps" | null (no image found). */
  imageSource?: string | null;
  sourceUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export type PlayPool = {
  items: PlayItem[];
  /** Which provider ultimately satisfied the request -- "musicbrainz"
   * (MusicBrainz/ListenBrainz combo had enough), "keeps_music" (topped
   * up with this space's own dropped songs), or "keeps_picks" (nothing
   * usable came back at all -- caller should use its own hardcoded
   * pack). */
  provider: string;
};
