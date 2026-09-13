import { createClient } from "@/lib/supabase/server";
import { isTasteArtist, type TasteArtist } from "@/lib/play-taste";

/** Server-side counterpart to /api/play/taste-profile's GET -- used by
 * the Tune your Play page itself so the initial screen (including
 * "editing" from Play Preferences) renders pre-filled without an extra
 * client round trip. */
export async function getTasteProfileServer(spaceId: string, userId: string): Promise<{ artists: TasteArtist[]; genres: string[] }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("play_taste_profiles")
    .select("music_artist_ids, music_genres")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .maybeSingle();

  const artists = Array.isArray(data?.music_artist_ids) ? (data.music_artist_ids as unknown[]).filter(isTasteArtist) : [];
  return { artists, genres: data?.music_genres ?? [] };
}
