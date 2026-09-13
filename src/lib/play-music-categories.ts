/** Shared between ChoiceGame (which stamps this onto the session it
 * creates) and /api/play/music-pool (which queries game_sessions by this
 * same value for duplicate-prevention) -- a single source of truth so
 * the two can never drift out of sync with each other. */
export const MUSIC_CATEGORY: Record<"artist" | "album" | "track", string> = {
  artist: "Music · Artists",
  album: "Music · Albums",
  track: "Music · Tracks",
};
