import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getArtistPlayItems, getAlbumPlayItems, getTrackPlayItems, type MusicFetchResult } from "@/services/play-providers/musicbrainz";
import { getKeepsMusicItems } from "@/services/play-providers/keeps-music";
import { getFamiliarityProfileSafe, type FamiliarityProfile } from "@/services/play-providers/familiarity";
import { MUSIC_CATEGORY } from "@/lib/play-music-categories";
import type { PlayItem, PlayPool } from "@/services/play-providers/types";

type Kind = "artist" | "album" | "track";

/** Recently-used item ids for this space+category, read from the existing
 * game_sessions history -- no new table needed. Keeps a matchup like
 * "SZA vs Doja Cat" from resurfacing every few rounds. */
async function getRecentlyUsedIds(spaceId: string, category: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("game_sessions")
    .select("prompt")
    .eq("space_id", spaceId)
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(15);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const items = (row.prompt as { items?: { id?: string }[] } | null)?.items ?? [];
    for (const item of items) if (item?.id) ids.add(item.id);
  }
  return ids;
}

async function fetchByKind(kind: Kind, count: number, exclude: Set<string>, profile: FamiliarityProfile): Promise<MusicFetchResult> {
  if (kind === "artist") return getArtistPlayItems(count, exclude, profile);
  if (kind === "album") return getAlbumPlayItems(count, exclude, profile);
  return getTrackPlayItems(count, exclude, profile);
}

/** Server-side only -- verification-era logging of the real fallback
 * chain (requested kind/count, provider actually used, live vs.
 * fallback counts, duration, failure reasons). Visible in server/
 * function logs, never in the client-facing response. */
function logMusicPoolRequest(entry: {
  requestedKind: Kind;
  requestedCount: number;
  providerUsed: string;
  fallbackReason: string | null;
  liveItemCount: number;
  fallbackItemCount: number;
  listenBrainzFailed: boolean;
  musicBrainzFailed: boolean;
  durationMs: number;
  excludeAndFamiliarityMs: number;
  providerFetchMs: number;
  fallbackMs: number;
}) {
  console.log("[play/music-pool]", JSON.stringify(entry));
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const params = req.nextUrl.searchParams;
  const kind = params.get("kind") as Kind | null;
  const count = Math.min(10, Math.max(1, Number(params.get("count")) || 2));
  const spaceId = params.get("spaceId");
  // Extra ids to exclude beyond recent history -- used by the "Don't
  // know this" / swap action so a just-rejected item can't come right
  // back as its own replacement.
  const excludeIdsParam = params.get("excludeIds");

  if (!kind || !["artist", "album", "track"].includes(kind) || !spaceId) {
    return NextResponse.json({ items: [], provider: "none" } satisfies PlayPool, { status: 400 });
  }

  const excludeStart = Date.now();
  const [historyExclude, profile] = await Promise.all([
    getRecentlyUsedIds(spaceId, MUSIC_CATEGORY[kind]).catch(() => new Set<string>()),
    getFamiliarityProfileSafe(spaceId),
  ]);
  const excludeAndFamiliarityMs = Date.now() - excludeStart;
  const exclude = new Set(historyExclude);
  if (excludeIdsParam) {
    for (const id of excludeIdsParam.split(",").map((s) => s.trim()).filter(Boolean)) exclude.add(id);
  }
  const providerFetchStart = Date.now();
  const { items: liveItems, listenBrainzFailed, musicBrainzFailed } = await fetchByKind(kind, count, exclude, profile);
  const providerFetchMs = Date.now() - providerFetchStart;

  const items: PlayItem[] = [...liveItems];
  const satisfiedByLiveProviders = items.length >= count;
  const liveItemCount = items.length;
  let fallbackItemCount = 0;

  const fallbackStart = Date.now();
  if (items.length < count) {
    const have = new Set(items.map((i) => i.title.toLowerCase()));
    const topUp = await getKeepsMusicItems(spaceId, kind, count - items.length + have.size).catch(() => []);
    for (const item of topUp) {
      if (items.length >= count) break;
      if (have.has(item.title.toLowerCase())) continue;
      have.add(item.title.toLowerCase());
      items.push(item);
      fallbackItemCount++;
    }
  }
  const fallbackMs = Date.now() - fallbackStart;

  // Honest three-way label: "musicbrainz" when ListenBrainz/MusicBrainz
  // alone had enough, "keeps_music" once real personal content had to
  // fill the gap, "keeps_picks" when even that came up short and the
  // caller (e.g. ChoiceGame) needs to fall back to its own hardcoded
  // pack.
  const provider = satisfiedByLiveProviders ? "musicbrainz" : items.length >= count ? "keeps_music" : "keeps_picks";

  const fallbackReason = satisfiedByLiveProviders
    ? null
    : listenBrainzFailed && musicBrainzFailed
      ? "listenbrainz and musicbrainz both failed/errored"
      : listenBrainzFailed
        ? "listenbrainz failed/errored; musicbrainz had too few results"
        : musicBrainzFailed
          ? "musicbrainz failed/errored after listenbrainz topped up"
          : `live providers only returned ${liveItemCount}/${count} usable items`;

  logMusicPoolRequest({
    requestedKind: kind,
    requestedCount: count,
    providerUsed: provider,
    fallbackReason,
    liveItemCount,
    fallbackItemCount,
    listenBrainzFailed,
    musicBrainzFailed,
    durationMs: Date.now() - start,
    excludeAndFamiliarityMs,
    providerFetchMs,
    fallbackMs,
  });

  return NextResponse.json({ items, provider } satisfies PlayPool);
}
