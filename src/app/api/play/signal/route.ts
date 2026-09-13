import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";
import { weightForSignal } from "@/services/play-providers/familiarity";

const VALID_SIGNAL_TYPES = new Set([
  "seen",
  "selected",
  "kept",
  "ranked",
  "skipped",
  "unknown",
  "swapped",
  "favorite",
  "dropped_in_keeps",
]);

/**
 * Records one familiarity signal for a Play content item -- selected,
 * kept, ranked, "don't know", swapped, etc. Fire-and-forget from the
 * client: a failure here should never block or interrupt gameplay, it
 * just means the round generator learns a little less this time.
 *
 * Never a preference/rating system -- see familiarity.ts: "selection
 * proves familiarity more than preference."
 */
export async function POST(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { spaceId?: string; itemId?: string; itemType?: string; source?: string; signalType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { spaceId, itemId, itemType, source, signalType } = body;
  if (!spaceId || !itemId || !itemType || !source || !signalType || !VALID_SIGNAL_TYPES.has(signalType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (spaceId !== ctx.space.id) return NextResponse.json({ ok: false }, { status: 403 });

  const supabase = await createClient();
  const { error } = await supabase.from("play_item_signals").insert({
    space_id: spaceId,
    user_id: ctx.userId,
    item_id: itemId,
    item_type: itemType,
    source,
    signal_type: signalType,
    weight: weightForSignal(signalType),
  });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  return NextResponse.json({ ok: true });
}
