import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildRunStartPayload } from "@/services/game-runs-server";
import { isRunGameType } from "@/lib/game-run-types";

/**
 * Client-side counterpart to the server-rendered page's own initial
 * fetch (see game-runs-server.ts's buildRunStartPayload, which both
 * this route and every daily-run page call) -- used when a client
 * component needs to re-check today's run state without a full page
 * reload (e.g. after returning from a "results when partner finishes"
 * screen).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { spaceId?: string; gameType?: string } | null;
  if (!body?.spaceId || !body.gameType || !isRunGameType(body.gameType)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const payload = await buildRunStartPayload(body.spaceId, body.gameType, user.id);
  return NextResponse.json(payload);
}
