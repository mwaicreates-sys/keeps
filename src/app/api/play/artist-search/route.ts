import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/services/session";
import { searchArtists } from "@/services/play-providers/musicbrainz";

/**
 * Free-text artist search backing "Tune your Play"'s search box --
 * fast, visual results, no detail page, no confirmation step (tapping
 * a result adds it to the selection immediately on the client).
 */
export async function GET(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ items: [] }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const items = await searchArtists(q, 8);
  return NextResponse.json({ items });
}
