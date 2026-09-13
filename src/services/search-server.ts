import { createClient } from "@/lib/supabase/server";

export type SearchResultType = "photo" | "video" | "song" | "text" | "activity" | "favorite" | "collection" | "game";

export type SearchResults = {
  posts: { id: string; type: string; caption: string | null; occurred_at: string; cover: string | null }[];
  songs: { post_id: string; title: string; artist: string | null; artwork_url: string | null }[];
  collections: { id: string; name: string; cover: string | null }[];
  games: { id: string; game_type: string; topic: string }[];
};

const POST_TYPES = new Set(["photo", "video", "text", "activity", "favorite"]);

/**
 * `type` narrows results to one content kind (used by the filter pill row
 * and each section's "See all" link) -- omit it for the default mixed
 * search.
 */
export async function searchSpace(spaceId: string, q: string, type?: SearchResultType): Promise<SearchResults> {
  const supabase = await createClient();
  if (!q.trim()) return { posts: [], songs: [], collections: [], games: [] };
  const like = `%${q}%`;

  const wantPosts = !type || POST_TYPES.has(type);
  const wantSongs = !type || type === "song";
  const wantCollections = !type || type === "collection";
  const wantGames = !type || type === "game";

  let postsQuery = supabase
    .from("posts")
    .select("id, type, caption, occurred_at, media:post_media(url)")
    .eq("space_id", spaceId)
    .or(`caption.ilike.${like},place.ilike.${like},category.ilike.${like}`)
    .limit(30);
  if (type && POST_TYPES.has(type)) postsQuery = postsQuery.eq("type", type);

  const [{ data: posts }, { data: songs }, { data: collections }, { data: games }] = await Promise.all([
    wantPosts ? postsQuery : Promise.resolve({ data: [] }),
    wantSongs
      ? supabase
          .from("post_song_metadata")
          .select("post_id, title, artist, artwork_url, posts!inner(space_id)")
          .eq("posts.space_id", spaceId)
          .or(`title.ilike.${like},artist.ilike.${like}`)
          .limit(20)
      : Promise.resolve({ data: [] }),
    wantCollections
      ? supabase
          .from("collections")
          .select("id, name, collection_items(posts(media:post_media(url)))")
          .eq("space_id", spaceId)
          .ilike("name", like)
          .limit(20)
      : Promise.resolve({ data: [] }),
    wantGames
      ? supabase.from("game_sessions").select("id, game_type, topic").eq("space_id", spaceId).ilike("topic", like).limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    posts: (posts ?? []).map((p) => ({
      id: p.id,
      type: p.type,
      caption: p.caption,
      occurred_at: p.occurred_at,
      cover: (p.media as { url: string }[] | null)?.[0]?.url ?? null,
    })),
    songs: (songs ?? []).map((s) => ({ post_id: s.post_id, title: s.title, artist: s.artist, artwork_url: s.artwork_url })),
    collections: (collections ?? []).map((c) => {
      const items = (c.collection_items ?? []) as { posts: { media: { url: string }[] | null } | null }[];
      const cover = items.map((i) => i.posts?.media?.[0]?.url).find((u): u is string => !!u) ?? null;
      return { id: c.id as string, name: c.name as string, cover };
    }),
    games: games ?? [],
  };
}

/** Same mapping Notifications uses to route a game_type to its real page. */
export function gameHref(gameType: string): string {
  const map: Record<string, string> = {
    this_or_that: "this-or-that",
    top5: "top5",
    blind_rank: "blind-rank",
    guess_mine: "guess-mine",
    keep3_drop2: "keep3-drop2",
  };
  return `/play/${map[gameType] ?? "this-or-that"}`;
}
