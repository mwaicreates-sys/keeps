import { mbGet } from "@/lib/musicbrainz/client";
import { timed } from "@/lib/perf-log";

type MbArtistRelations = {
  relations?: { type?: string; url?: { resource?: string } }[];
};

type WikidataEntityResponse = {
  entities?: Record<string, { claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]> }>;
};

type CommonsImageInfoResponse = {
  query?: { pages?: Record<string, { imageinfo?: { url?: string; thumburl?: string }[] }> };
};

// Cards render around 180-300px (see the Round components) -- 2x for
// retina is plenty. Requesting this from Commons directly (iiurlwidth)
// means a properly-sized JPEG comes back instead of the original file,
// which can be multiple megabytes at full resolution.
const THUMBNAIL_WIDTH_PX = 500;

function extractWikidataQid(rels: MbArtistRelations): string | null {
  for (const rel of rels.relations ?? []) {
    const resource = rel.url?.resource ?? "";
    const match = resource.match(/wikidata\.org\/wiki\/(Q\d+)/);
    if (match) return match[1];
  }
  return null;
}

/** Step: MusicBrainz artist -> its linked Wikidata QID, if any (the
 * "wikidata.artist_relation" stage). Split out from image resolution so
 * diagnostics -- and lookupArtist's own combined call -- can report/reuse
 * just this half. */
export async function getWikidataQidForArtist(artistMbid: string): Promise<string | null> {
  return timed(
    "wikidata.artist_relation",
    async () => {
      const rels = await mbGet<MbArtistRelations>(`/artist/${artistMbid}?inc=url-rels`, 60 * 60 * 24 * 7);
      return extractWikidataQid(rels);
    },
    { artistMbid }
  );
}

/** Step: Wikidata QID -> a real, hotlinkable Wikimedia Commons image URL,
 * resolved through Commons' own API (the "wikimedia.artist_image"
 * stage) -- never scraping a page. Returns null when the entity has no
 * P18 (image) claim or Commons can't resolve the file. */
export async function getWikimediaImageForQid(qid: string): Promise<string | null> {
  return timed(
    "wikimedia.artist_image",
    async () => {
      const entityRes = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, {
        next: { revalidate: 60 * 60 * 24 * 7 },
      });
      if (!entityRes.ok) return null;
      const entityData = (await entityRes.json()) as WikidataEntityResponse;
      const claims = entityData.entities?.[qid]?.claims?.P18; // P18 = "image"
      const filename = claims?.[0]?.mainsnak?.datavalue?.value;
      if (typeof filename !== "string") return null;

      const commonsRes = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
          `File:${filename}`
        )}&prop=imageinfo&iiprop=url&iiurlwidth=${THUMBNAIL_WIDTH_PX}&format=json&origin=*`,
        { next: { revalidate: 60 * 60 * 24 * 7 } }
      );
      if (!commonsRes.ok) return null;
      const commonsData = (await commonsRes.json()) as CommonsImageInfoResponse;
      const pages = Object.values(commonsData.query?.pages ?? {});
      const info = pages[0]?.imageinfo?.[0];
      // thumburl is a properly-sized JPEG at THUMBNAIL_WIDTH_PX; fall
      // back to the original only if Commons couldn't generate a
      // thumbnail (rare -- e.g. some SVG/PNG edge cases).
      return info?.thumburl ?? info?.url ?? null;
    },
    { qid }
  );
}

/** MusicBrainz artist -> Wikidata QID -> Wikimedia Commons image, as one
 * convenience call. Returns null at any step where nothing is linked/
 * available -- callers fall back to release artwork or a neutral
 * placeholder, never a broken image. */
export async function getArtistImageViaWikidata(artistMbid: string): Promise<string | null> {
  try {
    const qid = await getWikidataQidForArtist(artistMbid);
    if (!qid) return null;
    return await getWikimediaImageForQid(qid);
  } catch {
    return null;
  }
}
