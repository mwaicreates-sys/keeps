import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/services/session";
import { searchArtists, searchArtistsByTag, getArtistTags } from "@/services/play-providers/musicbrainz";
import { MAINSTREAM_ARTIST_SEEDS } from "@/lib/mainstream-artist-seeds";
import { logPerf } from "@/lib/perf-log";

const DESIRED_COUNT = 9;
// Overfetch: some names won't resolve an image (Wikidata gap, name
// mismatch) -- request more than we need so the UI never has to show
// a blank card. See the performance pass's "overfetch before display."
const COLD_START_OVERFETCH = 14;

/**
 * Suggestion candidates for "Tune your Play"'s artist grid. Every
 * returned item is already fully resolved (name + real imageUrl +
 * stable id) -- no candidate without a usable image is ever returned,
 * so the client never has to render (or wait on) an empty card.
 *
 * With no `basedOn`: broadly recognizable names (curated list of real
 * artist *names*, resolved into real ids/images at request time) --
 * the cold-start default the spec asks for instead of random/obscure
 * content.
 *
 * With `basedOn` (mbids the user has already tapped): looks up what
 * those artists are actually tagged as in MusicBrainz and searches
 * that tag for more real artists -- "pick SZA and Frank Ocean, get more
 * R&B" -- driven by real provider data, not a guess.
 */
export async function GET(req: NextRequest) {
  const start = Date.now();
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ items: [] }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const basedOn = (params.get("basedOn") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2);
  const exclude = new Set((params.get("exclude") ?? "").split(",").map((s) => s.trim()).filter(Boolean));

  if (basedOn.length > 0) {
    const tagLists = await Promise.all(basedOn.map((mbid) => getArtistTags(mbid)));
    const tagCounts = new Map<string, number>();
    for (const tags of tagLists) for (const tag of tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    const topTag = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (topTag) {
      // searchArtistsByTag already overfetches internally and only
      // returns candidates with a resolved image (resolveVisualBatch).
      const items = await searchArtistsByTag(topTag, DESIRED_COUNT, exclude);
      if (items.length > 0) {
        logPerf("tune_suggestions.adaptive", Date.now() - start, { basedOn, topTag, count: items.length });
        return NextResponse.json({ items, basedOnTag: topTag });
      }
    }
    // No usable tags (or the tag search came up empty) -- fall through
    // to the mainstream list rather than showing nothing.
  }

  const names = [...MAINSTREAM_ARTIST_SEEDS].sort(() => Math.random() - 0.5).slice(0, COLD_START_OVERFETCH);
  const results = await Promise.all(names.map((name) => searchArtists(name, 1)));
  const items = results
    .map((r) => r[0])
    .filter((item): item is NonNullable<typeof item> => !!item && !!item.imageUrl && !exclude.has(item.id))
    .slice(0, DESIRED_COUNT);

  logPerf("tune_suggestions.cold_start", Date.now() - start, { requested: names.length, resolved: items.length });
  return NextResponse.json({ items });
}
