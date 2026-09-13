import { mbGet } from "@/lib/musicbrainz/client";

type MbArtistRelations = {
  relations?: { type?: string; url?: { resource?: string } }[];
};

type WikidataEntityResponse = {
  entities?: Record<string, { claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]> }>;
};

type CommonsImageInfoResponse = {
  query?: { pages?: Record<string, { imageinfo?: { url?: string }[] }> };
};

function extractWikidataQid(rels: MbArtistRelations): string | null {
  for (const rel of rels.relations ?? []) {
    const resource = rel.url?.resource ?? "";
    const match = resource.match(/wikidata\.org\/wiki\/(Q\d+)/);
    if (match) return match[1];
  }
  return null;
}

/** MusicBrainz artist -> Wikidata QID -> a real, hotlinkable Wikimedia
 * Commons image URL, resolved through Commons' own API (never scraping a
 * page). Returns null at any step where nothing is linked/available --
 * callers fall back to release artwork or a neutral placeholder, never a
 * broken image. */
export async function getArtistImageViaWikidata(artistMbid: string): Promise<string | null> {
  try {
    const rels = await mbGet<MbArtistRelations>(`/artist/${artistMbid}?inc=url-rels`, 60 * 60 * 24 * 7);
    const qid = extractWikidataQid(rels);
    if (!qid) return null;

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
      )}&prop=imageinfo&iiprop=url&format=json&origin=*`,
      { next: { revalidate: 60 * 60 * 24 * 7 } }
    );
    if (!commonsRes.ok) return null;
    const commonsData = (await commonsRes.json()) as CommonsImageInfoResponse;
    const pages = Object.values(commonsData.query?.pages ?? {});
    return pages[0]?.imageinfo?.[0]?.url ?? null;
  } catch {
    return null;
  }
}
