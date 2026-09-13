import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDailyPlayCount } from "@/services/games-server";
import { DAILY_PLAY_CAP } from "@/lib/game-types";
import type { GameType } from "@/services/games-client";
import type { Json } from "@/lib/types";

const GAME_TYPES: GameType[] = ["this_or_that", "top5", "blind_rank", "match_predictions", "guess_mine", "keep3_drop2"];

/**
 * The ONLY path that may insert a new game_sessions row. Previously the
 * browser inserted directly (RLS-gated on space membership only) --
 * that's how a refresh, a new tab, or just reopening the game could
 * create session #6, #7, #8 today: there was nowhere server-side that
 * ever counted. This route is the fix: it re-derives the caller's own
 * identity from their auth cookie (never trusts a client-supplied
 * "createdBy"), counts *this specific user's* sessions of this game
 * type created since UTC midnight, and refuses to insert once that
 * count has reached DAILY_PLAY_CAP -- before the row is ever created,
 * not as an after-the-fact check. Since createGameSession (the only
 * client-side entry point) now calls this route instead of inserting
 * directly, there is no remaining path -- refresh, new route, new
 * session, reopening the game -- that bypasses it.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    spaceId?: string;
    otherMemberId?: string | null;
    gameType?: string;
    topic?: string;
    category?: string;
    prompt?: Record<string, unknown>;
  } | null;

  if (!body?.spaceId || !body.gameType || !GAME_TYPES.includes(body.gameType as GameType) || !body.topic) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const gameType = body.gameType as GameType;

  const dailyCount = await getDailyPlayCount(body.spaceId, gameType, user.id);
  if (dailyCount >= DAILY_PLAY_CAP) {
    return NextResponse.json({ error: "daily_cap_reached", limit: DAILY_PLAY_CAP }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("game_sessions")
    .insert({
      space_id: body.spaceId,
      game_type: gameType,
      topic: body.topic,
      category: body.category || null,
      prompt: (body.prompt ?? {}) as Json,
      created_by: user.id, // always the authenticated caller -- never trusts a client-supplied id
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Fire-and-forget partner notification -- same best-effort behavior
  // as before, just server-side now.
  if (body.otherMemberId) {
    void supabase.from("notifications").insert({
      space_id: body.spaceId,
      user_id: body.otherMemberId,
      type: "game_invite",
      category: "play",
      title: `New ${gameLabel(gameType)} challenge`,
      body: body.topic,
      data: { sessionId: data.id, gameType } as Json,
    });
  }

  return NextResponse.json({ session: data, playedToday: dailyCount + 1, limit: DAILY_PLAY_CAP });
}

function gameLabel(type: GameType): string {
  switch (type) {
    case "this_or_that":
      return "This or That";
    case "top5":
      return "My Top 5";
    case "blind_rank":
      return "Blind Rank";
    case "match_predictions":
      return "Match Predictions";
    case "guess_mine":
      return "Guess Mine";
    case "keep3_drop2":
      return "Keep 3, Drop 2";
  }
}
