/**
 * A curated list of broadly recognizable artist *names* -- not content
 * itself. Used two places, both purely as a starting point that gets
 * replaced by real signal as soon as any exists:
 *
 *  1. "Tune your Play"'s initial suggestion grid, before the user has
 *     tapped anything -- resolved into real MusicBrainz ids/images at
 *     request time via search, same as any other artist.
 *  2. The familiarity cold-start fallback (familiarity.ts) -- injected
 *     into the "known names" set only when a space has *zero* other
 *     signal (no drops, no taste profile, no gameplay history), so a
 *     brand-new space's very first round doesn't have to rely on
 *     whatever a random genre-tag search happens to surface.
 *
 * Deliberately broad/global rather than hyper-current -- the point is
 * "most people have heard of this," not "this is trending right now."
 */
export const MAINSTREAM_ARTIST_SEEDS: string[] = [
  "Beyoncé",
  "Rihanna",
  "Drake",
  "Taylor Swift",
  "Ed Sheeran",
  "Adele",
  "The Weeknd",
  "Kendrick Lamar",
  "SZA",
  "Bruno Mars",
  "Ariana Grande",
  "Dua Lipa",
  "Justin Bieber",
  "Billie Eilish",
  "Coldplay",
  "Bad Bunny",
  "Burna Boy",
  "Wizkid",
  "Davido",
  "Sarkodie",
  "Diamond Platnumz",
  "Sauti Sol",
  "Eminem",
  "Jay-Z",
  "Kanye West",
  "Nicki Minaj",
  "Cardi B",
  "Doja Cat",
  "Frank Ocean",
  "Tems",
  "John Legend",
  "Whitney Houston",
  "Michael Jackson",
  "Bob Marley",
  "Fela Kuti",
  "Stevie Wonder",
  "Alicia Keys",
  "Usher",
  "Chris Brown",
  "Sam Smith",
];
