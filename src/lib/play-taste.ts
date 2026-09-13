/** One artist the user picked in "Tune your Play". The MusicBrainz id
 * is what actually matters for round generation (familiarity.ts scores
 * against it directly) -- name/imageUrl are kept alongside it purely so
 * the setup screen and Play Preferences can redraw the chosen card
 * without an extra lookup, not as the source of truth. */
export type TasteArtist = {
  mbid: string;
  name: string;
  imageUrl: string | null;
};

export const MIN_TASTE_ARTISTS = 5;

/** The optional second "Anything else you're into?" step -- plain
 * chips, not a genre taxonomy lesson. Matches familiarity.ts's
 * `pickSeedGenre`, which just needs *a* tag string per chip. */
export const TASTE_GENRE_CHIPS = [
  "R&B",
  "Hip-hop",
  "Afrobeats",
  "Pop",
  "Rock",
  "Electronic",
  "Gospel",
  "Jazz",
  "Indie",
  "Reggae",
];

export function isTasteArtist(value: unknown): value is TasteArtist {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.mbid === "string" && typeof v.name === "string" && (v.imageUrl === null || typeof v.imageUrl === "string");
}
