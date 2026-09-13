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

export type SearchShowcaseItem = {
  photo: { url: string } | null;
  song: { title: string; artist: string | null } | null;
  text: { caption: string } | null;
};

/**
 * Just enough for SearchShowcase's 3 preview cards -- a far lighter
 * query than reusing getFeed() (which joins author/media/song/favorite/
 * reactions and then runs 2 more batched queries for comment counts and
 * saved-item status, none of which the showcase needs). One narrow
 * select, capped small, no hydration step.
 */
export async function getSearchShowcase(spaceId: string): Promise<SearchShowcaseItem> {
  const supabase = await createClient();
  // post_media and post_song_metadata have no created_at of their own —
  // querying them directly (as this used to) and ordering by created_at
  // fails silently (Supabase returns an error, not a thrown exception,
  // so the missing photo/song went unnoticed). Query from posts instead
  // (which does have created_at) with an inner-joined, filtered embed.
  const [{ data: photoRow }, { data: songRow }, { data: textRow }] = await Promise.all([
    supabase
      .from("posts")
      .select("post_media!inner(url)")
      .eq("space_id", spaceId)
      .eq("post_media.media_type", "photo")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("posts")
      .select("post_song_metadata!inner(title, artist)")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("posts")
      .select("caption")
      .eq("space_id", spaceId)
      .eq("type", "text")
      .not("caption", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const photo = (photoRow?.post_media as { url: string }[] | null)?.[0] ?? null;
  const song = (songRow?.post_song_metadata as { title: string; artist: string | null } | null) ?? null;

  return {
    photo: photo ? { url: photo.url } : null,
    song: song ? { title: song.title, artist: song.artist } : null,
    text: textRow?.caption ? { caption: textRow.caption } : null,
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
    match_predictions: "match-predictions",
  };
  return `/play/${map[gameType] ?? "this-or-that"}`;
}
