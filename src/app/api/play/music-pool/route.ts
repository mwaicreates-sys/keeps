import { NextRequest, NextResponse } from "next/server";
import { resolveMusicPool } from "@/services/content-pool-server";
import type { PlayPool } from "@/services/play-providers/types";

type Kind = "artist" | "album" | "track";

/** Thin HTTP wrapper around content-pool-server.ts's resolveMusicPool --
 * the browser's only path to MusicBrainz/ListenBrainz-backed content.
 * The same resolver is also called directly, in-process, by the daily-
 * run generator and the run-swap route (see game-runs-server.ts,
 * content-pool-server.ts's own docs on why that has to be a direct
 * call rather than another fetch to this route). */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const kind = params.get("kind") as Kind | null;
  const count = Math.min(10, Math.max(1, Number(params.get("count")) || 2));
  const spaceId = params.get("spaceId");
  const excludeIdsParam = params.get("excludeIds");

  if (!kind || !["artist", "album", "track"].includes(kind) || !spaceId) {
    return NextResponse.json({ items: [], provider: "none" } satisfies PlayPool, { status: 400 });
  }
  const excludeIds = excludeIdsParam ? excludeIdsParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

  const pool = await resolveMusicPool(kind, count, spaceId, excludeIds);
  return NextResponse.json(pool);
}
