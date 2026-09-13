import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMoviePlayItems, getTvPlayItems, getPersonPlayItems, type MovieFetchResult } from "@/services/play-providers/tmdb";
import { getFamiliarityProfileSafe } from "@/services/play-providers/familiarity";
import { MOVIE_CATEGORY } from "@/lib/play-content-categories";
import type { PlayPool } from "@/services/play-providers/types";

type Kind = "movie" | "tv" | "person";

/** Same duplicate-prevention approach as /api/play/music-pool: recently
 * used ids for this space+category, read straight from game_sessions
 * history -- no new table. */
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

async function fetchByKind(kind: Kind, count: number, exclude: Set<string>, profile: Parameters<typeof getMoviePlayItems>[2]): Promise<MovieFetchResult> {
  if (kind === "movie") return getMoviePlayItems(count, exclude, profile);
  if (kind === "tv") return getTvPlayItems(count, exclude, profile);
  return getPersonPlayItems(count, exclude, profile);
}

function logMoviePoolRequest(entry: {
  requestedKind: Kind;
  requestedCount: number;
  providerUsed: string;
  liveItemCount: number;
  failed: boolean;
  durationMs: number;
  excludeAndFamiliarityMs: number;
  providerFetchMs: number;
}) {
  console.log("[play/movie-pool]", JSON.stringify(entry));
}

export async function GET(req: NextRequest) {
  const start = Date.now();
  const params = req.nextUrl.searchParams;
  const kind = params.get("kind") as Kind | null;
  const count = Math.min(10, Math.max(1, Number(params.get("count")) || 2));
  const spaceId = params.get("spaceId");
  const excludeIdsParam = params.get("excludeIds");

  if (!kind || !["movie", "tv", "person"].includes(kind) || !spaceId) {
    return NextResponse.json({ items: [], provider: "none" } satisfies PlayPool, { status: 400 });
  }

  const excludeStart = Date.now();
  const [historyExclude, profile] = await Promise.all([
    getRecentlyUsedIds(spaceId, MOVIE_CATEGORY[kind]).catch(() => new Set<string>()),
    getFamiliarityProfileSafe(spaceId),
  ]);
  const excludeAndFamiliarityMs = Date.now() - excludeStart;
  const exclude = new Set(historyExclude);
  if (excludeIdsParam) {
    for (const id of excludeIdsParam.split(",").map((s) => s.trim()).filter(Boolean)) exclude.add(id);
  }

  const providerFetchStart = Date.now();
  const { items, failed } = await fetchByKind(kind, count, exclude, profile);
  const providerFetchMs = Date.now() - providerFetchStart;

  // No "Keeps' own drops" tier exists for movies/TV (unlike music,
  // there's no user-generated movie content in this app) -- if TMDb
  // comes up short, the caller (choice/blind-rank/keep-drop prompt)
  // falls back to its own hardcoded pack, same as music does when even
  // that fails.
  const provider = items.length >= count ? "tmdb" : "tmdb_partial";

  logMoviePoolRequest({
    requestedKind: kind,
    requestedCount: count,
    providerUsed: provider,
    liveItemCount: items.length,
    failed,
    durationMs: Date.now() - start,
    excludeAndFamiliarityMs,
    providerFetchMs,
  });

  return NextResponse.json({ items, provider } satisfies PlayPool);
}
