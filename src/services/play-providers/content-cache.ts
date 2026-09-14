import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types";

/**
 * A persistent, shared cache of already-resolved provider content --
 * the actual fix for "images take too long to appear."
 *
 * The MusicBrainz client throttles every call through an in-process
 * queue (~1.1s between requests, see lib/musicbrainz/client.ts) to
 * respect their usage policy. That queue gates *every call*, including
 * ones whose response never changes (an artist's canonical name, their
 * Wikidata-linked photo, an album's cover art) -- so resolving N
 * artists always costs N x ~1.1s minimum, even for artists resolved a
 * thousand times before. Next's own fetch cache doesn't help here: it
 * only dedupes identical HTTP calls, it doesn't skip the throttle queue
 * those calls still have to wait in.
 *
 * This table sits in front of that whole chain: a single fast Supabase
 * read either returns a complete, already-resolved result (no
 * MusicBrainz/Wikidata/Wikimedia/Cover Art Archive round trip at all),
 * or reports a miss so the caller falls through to the real resolution
 * chain -- which then writes its result back here for every future
 * request (any user, any space, any serverless instance) to reuse.
 */

const ARTIST_TTL_SECONDS = 60 * 60 * 24 * 14; // 2 weeks -- identity/photo rarely changes
const ALBUM_TTL_SECONDS = 60 * 60 * 24 * 14; // 2 weeks -- cover art rarely changes

export type CachedArtistVisual = { name: string; disambiguation: string | null; imageUrl: string | null };

/** Returns the cached visual for an artist mbid, or `undefined` on a
 * genuine cache miss (row doesn't exist, or expired). A resolved-but-
 * imageless artist is still a cache *hit* (imageUrl: null) -- there's
 * no reason to re-walk Wikidata/Wikimedia every time just because the
 * artist happens to have no photo. */
export async function getCachedArtistVisual(mbid: string): Promise<CachedArtistVisual | undefined> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("play_content_cache")
      .select("title, metadata, image_url")
      .eq("item_type", "artist")
      .eq("item_id", mbid)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!data || !data.title) return undefined;
    const meta = (data.metadata ?? {}) as { disambiguation?: string | null };
    return { name: data.title, disambiguation: meta.disambiguation ?? null, imageUrl: data.image_url };
  } catch {
    return undefined; // cache read failure -- resolve fresh rather than fail the round
  }
}

export async function setCachedArtistVisual(mbid: string, visual: CachedArtistVisual): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("play_content_cache").upsert({
      item_type: "artist",
      item_id: mbid,
      title: visual.name,
      metadata: { disambiguation: visual.disambiguation },
      image_url: visual.imageUrl,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ARTIST_TTL_SECONDS * 1000).toISOString(),
    });
  } catch {
    // Best-effort -- a failed cache write just means the next request
    // resolves fresh again, not a broken round.
  }
}

/** Same idea for a standalone image lookup keyed by any item id (album
 * cover art, currently) -- `undefined` = miss, `null` = cached "no
 * image exists for this item," a string = the cached URL. */
export async function getCachedImage(itemType: string, itemId: string): Promise<string | null | undefined> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("play_content_cache")
      .select("image_url")
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error || !data) return undefined;
    return data.image_url;
  } catch {
    return undefined;
  }
}

const ARTIST_NAME_TTL_SECONDS = 60 * 60 * 24 * 30; // a name resolving to a given mbid essentially never changes

/** Caches "this exact artist name resolved to this mbid" -- used only
 * by Tune your Play's cold-start suggestions, which re-search the same
 * ~40 curated names over and over across every new space. Without
 * this, every cold-start request pays a fresh MusicBrainz *search* per
 * name (on top of the per-mbid identity/image cache above), even
 * though the same curated name always resolves to the same artist. */
export async function getCachedArtistIdByName(name: string): Promise<string | undefined> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("play_content_cache")
      .select("title")
      .eq("item_type", "artist_name")
      .eq("item_id", name.trim().toLowerCase())
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    return data?.title ?? undefined;
  } catch {
    return undefined;
  }
}

export async function setCachedArtistIdByName(name: string, mbid: string): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("play_content_cache").upsert({
      item_type: "artist_name",
      item_id: name.trim().toLowerCase(),
      title: mbid,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ARTIST_NAME_TTL_SECONDS * 1000).toISOString(),
    });
  } catch {
    // Best-effort only.
  }
}

export async function setCachedImage(itemType: string, itemId: string, imageUrl: string | null): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("play_content_cache").upsert({
      item_type: itemType,
      item_id: itemId,
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ALBUM_TTL_SECONDS * 1000).toISOString(),
    });
  } catch {
    // Best-effort only.
  }
}

// --- Batch reads/writes -------------------------------------------
//
// Everything above resolves one id at a time -- fine for a single
// lookup, but the daily-run pool generator now prepares 20-25
// candidates per kind up front, and every one of those candidates was
// hitting this table individually (~50 Supabase REST calls measured in
// one This or That generation burst in production). These batch
// equivalents exist purely to collapse that into one read + one write
// per pool: same table, same TTL semantics, same "no title/no row =
// miss" rules as their single-item counterparts above -- callers that
// already know their whole candidate list up front (every pool
// preparation does) should use these instead of looping the
// single-item functions.

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

// Supabase's `.in()` has a practical URL-length ceiling; a daily pool
// (a few dozen ids at most) never approaches it, but chunking keeps
// this safe rather than assuming that forever.
const BATCH_READ_CHUNK_SIZE = 200;

export async function getCachedArtistVisualsBatch(mbids: string[]): Promise<Map<string, CachedArtistVisual>> {
  const result = new Map<string, CachedArtistVisual>();
  const ids = [...new Set(mbids)];
  if (ids.length === 0) return result;
  try {
    const supabase = await createClient();
    for (const part of chunkIds(ids, BATCH_READ_CHUNK_SIZE)) {
      const { data } = await supabase
        .from("play_content_cache")
        .select("item_id, title, metadata, image_url")
        .eq("item_type", "artist")
        .in("item_id", part)
        .gt("expires_at", new Date().toISOString());
      for (const row of data ?? []) {
        if (!row.title) continue; // same "no title = not a real hit" rule as getCachedArtistVisual
        const meta = (row.metadata ?? {}) as { disambiguation?: string | null };
        result.set(row.item_id, { name: row.title, disambiguation: meta.disambiguation ?? null, imageUrl: row.image_url });
      }
    }
  } catch {
    // Cache read failure -- every id below just falls through as a miss.
  }
  return result;
}

export async function setCachedArtistVisualsBatch(entries: { mbid: string; visual: CachedArtistVisual }[]): Promise<void> {
  if (entries.length === 0) return;
  try {
    const supabase = await createClient();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ARTIST_TTL_SECONDS * 1000).toISOString();
    await supabase.from("play_content_cache").upsert(
      entries.map(({ mbid, visual }) => ({
        item_type: "artist",
        item_id: mbid,
        title: visual.name,
        metadata: { disambiguation: visual.disambiguation },
        image_url: visual.imageUrl,
        updated_at: now.toISOString(),
        expires_at: expiresAt,
      }))
    );
  } catch {
    // Best-effort, same as setCachedArtistVisual.
  }
}

/** Same idea as getCachedImage/setCachedImage, batched. */
export async function getCachedImagesBatch(itemType: string, itemIds: string[]): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const ids = [...new Set(itemIds)];
  if (ids.length === 0) return result;
  try {
    const supabase = await createClient();
    for (const part of chunkIds(ids, BATCH_READ_CHUNK_SIZE)) {
      const { data } = await supabase
        .from("play_content_cache")
        .select("item_id, image_url")
        .eq("item_type", itemType)
        .in("item_id", part)
        .gt("expires_at", new Date().toISOString());
      for (const row of data ?? []) result.set(row.item_id, row.image_url);
    }
  } catch {
    // Falls through as a miss for every id.
  }
  return result;
}

export async function setCachedImagesBatch(itemType: string, entries: { itemId: string; imageUrl: string | null }[]): Promise<void> {
  if (entries.length === 0) return;
  try {
    const supabase = await createClient();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ALBUM_TTL_SECONDS * 1000).toISOString();
    await supabase.from("play_content_cache").upsert(
      entries.map(({ itemId, imageUrl }) => ({
        item_type: itemType,
        item_id: itemId,
        image_url: imageUrl,
        updated_at: now.toISOString(),
        expires_at: expiresAt,
      }))
    );
  } catch {
    // Best-effort, same as setCachedImage.
  }
}

const CONTENT_ITEM_TTL_SECONDS = 60 * 60 * 24 * 14; // 2 weeks -- generic default for any resolved content item

/** Generic version of getCachedArtistVisual/setCachedArtistVisual --
 * caches a full resolved item (title, subtitle, image, arbitrary
 * metadata) under any `itemType`. Used by the TMDb provider (movie/tv/
 * person) so it never re-fetches TMDb for the same title twice; the
 * music-specific functions above are kept as-is rather than refactored
 * onto this, per "do not alter the existing music provider
 * architecture." A resolved-but-imageless item is still a cache *hit*
 * (imageUrl: null) -- no reason to re-fetch just because it has no
 * usable image. */
export type CachedContentItem = { title: string | null; subtitle: string | null; imageUrl: string | null; metadata: Record<string, unknown> };

export async function getCachedContentItem(itemType: string, itemId: string): Promise<CachedContentItem | undefined> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("play_content_cache")
      .select("title, subtitle, image_url, metadata")
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!data) return undefined;
    return { title: data.title, subtitle: data.subtitle, imageUrl: data.image_url, metadata: (data.metadata as Record<string, unknown>) ?? {} };
  } catch {
    return undefined;
  }
}

export async function setCachedContentItem(
  itemType: string,
  itemId: string,
  item: CachedContentItem,
  ttlSeconds: number = CONTENT_ITEM_TTL_SECONDS
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("play_content_cache").upsert({
      item_type: itemType,
      item_id: itemId,
      title: item.title,
      subtitle: item.subtitle,
      image_url: item.imageUrl,
      metadata: item.metadata as Json,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    });
  } catch {
    // Best-effort only.
  }
}

/** Batched getCachedContentItem -- one Supabase read for a whole
 * candidate list (TMDb movie/tv/person pools) instead of one per id. */
export async function getCachedContentItemsBatch(itemType: string, itemIds: string[]): Promise<Map<string, CachedContentItem>> {
  const result = new Map<string, CachedContentItem>();
  const ids = [...new Set(itemIds)];
  if (ids.length === 0) return result;
  try {
    const supabase = await createClient();
    for (const part of chunkIds(ids, BATCH_READ_CHUNK_SIZE)) {
      const { data } = await supabase
        .from("play_content_cache")
        .select("item_id, title, subtitle, image_url, metadata")
        .eq("item_type", itemType)
        .in("item_id", part)
        .gt("expires_at", new Date().toISOString());
      for (const row of data ?? []) {
        result.set(row.item_id, { title: row.title, subtitle: row.subtitle, imageUrl: row.image_url, metadata: (row.metadata as Record<string, unknown>) ?? {} });
      }
    }
  } catch {
    // Falls through as a miss for every id.
  }
  return result;
}

/** Batched setCachedContentItem -- one upsert for every id resolved
 * fresh this round instead of one per id. */
export async function setCachedContentItemsBatch(
  itemType: string,
  entries: { itemId: string; item: CachedContentItem }[],
  ttlSeconds: number = CONTENT_ITEM_TTL_SECONDS
): Promise<void> {
  if (entries.length === 0) return;
  try {
    const supabase = await createClient();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    await supabase.from("play_content_cache").upsert(
      entries.map(({ itemId, item }) => ({
        item_type: itemType,
        item_id: itemId,
        title: item.title,
        subtitle: item.subtitle,
        image_url: item.imageUrl,
        metadata: item.metadata as Json,
        updated_at: now.toISOString(),
        expires_at: expiresAt,
      }))
    );
  } catch {
    // Best-effort only.
  }
}
