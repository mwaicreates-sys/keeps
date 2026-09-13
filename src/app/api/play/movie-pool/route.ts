import { NextRequest, NextResponse } from "next/server";
import { resolveMoviePool } from "@/services/content-pool-server";
import type { PlayPool } from "@/services/play-providers/types";

type Kind = "movie" | "tv" | "person";

/** Thin HTTP wrapper around content-pool-server.ts's resolveMoviePool --
 * the browser's only path to TMDb-backed content. The same resolver is
 * also called directly, in-process, by the daily-run generator and the
 * run-swap route. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const kind = params.get("kind") as Kind | null;
  const count = Math.min(10, Math.max(1, Number(params.get("count")) || 2));
  const spaceId = params.get("spaceId");
  const excludeIdsParam = params.get("excludeIds");

  if (!kind || !["movie", "tv", "person"].includes(kind) || !spaceId) {
    return NextResponse.json({ items: [], provider: "none" } satisfies PlayPool, { status: 400 });
  }
  const excludeIds = excludeIdsParam ? excludeIdsParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

  const pool = await resolveMoviePool(kind, count, spaceId, excludeIds);
  return NextResponse.json(pool);
}
