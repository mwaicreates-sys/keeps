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
