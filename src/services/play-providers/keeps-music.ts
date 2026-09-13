import { createClient } from "@/lib/supabase/server";
import type { PlayItem } from "@/services/play-providers/types";

type SongRow = {
  id: string;
  post_song_metadata: { title: string; artist: string | null; album: string | null; artwork_url: string | null };
};

/**
 * Fallback music content sourced from this space's own dropped songs --
 * real Keeps content, not generic filler, used when MusicBrainz is
 * unavailable/rate-limited or simply doesn't have enough fresh items.
 */
export async function getKeepsMusicItems(
  spaceId: string,
  kind: "artist" | "album" | "track",
  count: number
): Promise<PlayItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, post_song_metadata!inner(title, artist, album, artwork_url)")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as unknown as SongRow[];

  if (kind === "artist") {
    const seen = new Set<string>();
    const items: PlayItem[] = [];
    for (const row of rows) {
      const artist = row.post_song_metadata.artist;
      if (!artist || seen.has(artist)) continue;
      seen.add(artist);
      items.push({
        id: `keeps-artist-${artist}`,
        type: "artist",
        title: artist,
        imageUrl: row.post_song_metadata.artwork_url,
        source: "keeps",
      });
      if (items.length >= count) break;
    }
    return items;
  }

  if (kind === "album") {
    const seen = new Set<string>();
    const items: PlayItem[] = [];
    for (const row of rows) {
      const album = row.post_song_metadata.album;
      if (!album || seen.has(album)) continue;
      seen.add(album);
      items.push({
        id: `keeps-album-${album}`,
        type: "album",
        title: album,
        subtitle: row.post_song_metadata.artist,
        imageUrl: row.post_song_metadata.artwork_url,
        source: "keeps",
      });
      if (items.length >= count) break;
    }
    return items;
  }

  return rows.slice(0, count).map((row) => ({
    id: `keeps-track-${row.id}`,
    type: "track" as const,
    title: row.post_song_metadata.title,
    subtitle: row.post_song_metadata.artist,
    imageUrl: row.post_song_metadata.artwork_url,
    source: "keeps",
  }));
}
