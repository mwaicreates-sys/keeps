/**
 * Server-only ListenBrainz client -- Keeps' one CURRENT/DISCOVERY source
 * (see the provider flow: ListenBrainz surfaces what's fresh, MusicBrainz
 * still confirms the metadata). Public, keyless, but this throws a typed
 * error carrying the real HTTP status on failure -- rather than
 * swallowing it -- specifically so callers (and the diagnostics route)
 * can tell "ListenBrainz said 429" apart from "ListenBrainz had nothing."
 */
const USER_AGENT = "Keeps/1.0 ( https://keeps-ashy.vercel.app )";
const BASE_URL = "https://api.listenbrainz.org/1";

export type FreshRelease = {
  artist_credit_name?: string;
  artist_mbids?: string[];
  release_name?: string;
  release_mbid?: string;
  release_group_mbid?: string;
  release_date?: string;
};

export class ListenBrainzError extends Error {
  status: number;
  constructor(status: number) {
    super(`ListenBrainz responded ${status}`);
    this.name = "ListenBrainzError";
    this.status = status;
  }
}

export async function getFreshReleases(days = 14): Promise<FreshRelease[]> {
  const res = await fetch(`${BASE_URL}/explore/fresh-releases/?days=${days}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    next: { revalidate: 60 * 60 * 6 },
  });
  if (!res.ok) throw new ListenBrainzError(res.status);
  const data = (await res.json()) as { payload?: { releases?: FreshRelease[] } };
  return data.payload?.releases ?? [];
}
