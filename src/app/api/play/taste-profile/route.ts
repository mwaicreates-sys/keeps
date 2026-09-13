import { NextRequest, NextResponse } from "next/server";
import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";
import { isTasteArtist } from "@/lib/play-taste";

/**
 * The current user's own "Tune your Play" taste profile for their
 * space -- one row per (user, space), read/written only by that user
 * (RLS: play_taste_profiles_all), though any space member can read
 * *both* rows (familiarity.ts needs the combined taste graph for
 * shared games).
 */
export async function GET() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ artists: [], genres: [] }, { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("play_taste_profiles")
    .select("music_artist_ids, music_genres")
    .eq("space_id", ctx.space.id)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  return NextResponse.json({
    artists: Array.isArray(data?.music_artist_ids) ? data.music_artist_ids : [],
    genres: data?.music_genres ?? [],
  });
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { artists?: unknown; genres?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const artists = Array.isArray(body.artists) ? body.artists.filter(isTasteArtist).slice(0, 30) : [];
  const genres = Array.isArray(body.genres) ? body.genres.filter((g): g is string => typeof g === "string").slice(0, 15) : [];

  const supabase = await createClient();
  const { error } = await supabase.from("play_taste_profiles").upsert(
    {
      user_id: ctx.userId,
      space_id: ctx.space.id,
      music_artist_ids: artists,
      music_genres: genres,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,space_id" }
  );
  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  return NextResponse.json({ ok: true });
}
