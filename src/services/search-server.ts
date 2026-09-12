import { createClient } from "@/lib/supabase/server";

export type SearchResults = {
  posts: { id: string; type: string; caption: string | null; occurred_at: string }[];
  songs: { post_id: string; title: string; artist: string | null }[];
  collections: { id: string; name: string }[];
  games: { id: string; game_type: string; topic: string }[];
};

export async function searchSpace(spaceId: string, q: string): Promise<SearchResults> {
  const supabase = await createClient();
  if (!q.trim()) return { posts: [], songs: [], collections: [], games: [] };
  const like = `%${q}%`;

  const [{ data: posts }, { data: songs }, { data: collections }, { data: games }] = await Promise.all([
    supabase
      .from("posts")
      .select("id, type, caption, occurred_at")
      .eq("space_id", spaceId)
      .or(`caption.ilike.${like},place.ilike.${like},category.ilike.${like}`)
      .limit(30),
    supabase
      .from("post_song_metadata")
      .select("post_id, title, artist, posts!inner(space_id)")
      .eq("posts.space_id", spaceId)
      .or(`title.ilike.${like},artist.ilike.${like}`)
      .limit(20),
    supabase.from("collections").select("id, name").eq("space_id", spaceId).ilike("name", like).limit(20),
    supabase.from("game_sessions").select("id, game_type, topic").eq("space_id", spaceId).ilike("topic", like).limit(20),
  ]);

  return {
    posts: posts ?? [],
    songs: (songs ?? []).map((s) => ({ post_id: s.post_id, title: s.title, artist: s.artist })),
    collections: collections ?? [],
    games: games ?? [],
  };
}
