import { createClient } from "@/lib/supabase/server";
import type { FeedPost } from "@/lib/domain-types";
import type { Tables } from "@/lib/types";

const POST_SELECT = `
  *,
  author:profiles!posts_author_id_fkey(*),
  media:post_media(*),
  song:post_song_metadata(*),
  favorite:post_favorite_metadata(*),
  reactions(*)
`;

async function hydratePosts(
  rows: Record<string, unknown>[],
  userId: string
): Promise<FeedPost[]> {
  const supabase = await createClient();
  const ids = rows.map((r) => r.id as string);
  if (ids.length === 0) return [];

  const [{ data: commentRows }, { data: savedRows }] = await Promise.all([
    supabase.from("comments").select("post_id").in("post_id", ids),
    supabase.from("saved_items").select("post_id").eq("user_id", userId).in("post_id", ids),
  ]);

  const commentCounts = new Map<string, number>();
  for (const c of commentRows ?? []) {
    commentCounts.set(c.post_id, (commentCounts.get(c.post_id) ?? 0) + 1);
  }
  const savedSet = new Set((savedRows ?? []).map((s) => s.post_id));

  return rows.map((r) => ({
    ...(r as unknown as Tables<"posts">),
    author: r.author as Tables<"profiles">,
    media: (r.media as Tables<"post_media">[]) ?? [],
    // post_song_metadata.post_id and post_favorite_metadata.post_id are each
    // the table's primary key, so PostgREST treats these as to-one
    // relationships and embeds a single object (or null) — never an array.
    // (Previously read as `song[0]`/`favorite[0]`, which is always undefined
    // for an object, silently dropping every song/favorite Drop's data.)
    song: (r.song as Tables<"post_song_metadata"> | null) ?? null,
    favorite: (r.favorite as Tables<"post_favorite_metadata"> | null) ?? null,
    reactions: (r.reactions as Tables<"reactions">[]) ?? [],
    commentCount: commentCounts.get(r.id as string) ?? 0,
    isSaved: savedSet.has(r.id as string),
  }));
}

export async function getFeed(spaceId: string, userId: string, limit = 20): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return hydratePosts(data ?? [], userId);
}

export type MemoryFilters = {
  year?: number;
  category?: string;
  authorId?: string;
  tag?: string;
  q?: string;
};

export async function getMemories(
  spaceId: string,
  userId: string,
  filters: MemoryFilters = {}
): Promise<FeedPost[]> {
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("space_id", spaceId)
    .eq("saved_to_memories", true)
    .order("occurred_at", { ascending: false });

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.authorId) query = query.eq("author_id", filters.authorId);
  if (filters.q) query = query.ilike("caption", `%${filters.q}%`);
  if (filters.year) {
    query = query
      .gte("occurred_at", `${filters.year}-01-01`)
      .lt("occurred_at", `${filters.year + 1}-01-01`);
  }

  const { data, error } = await query.limit(200);
  if (error) throw error;
  let posts = await hydratePosts(data ?? [], userId);

  if (filters.tag) {
    const { data: tagRows } = await supabase
      .from("tags")
      .select("id, post_tags(post_id)")
      .eq("space_id", spaceId)
      .eq("name", filters.tag.toLowerCase())
      .maybeSingle();
    const ids = new Set((tagRows?.post_tags as { post_id: string }[] | undefined)?.map((t) => t.post_id));
    posts = posts.filter((p) => ids.has(p.id));
  }

  return posts;
}

export async function getSavedPosts(userId: string): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data: savedRows } = await supabase
    .from("saved_items")
    .select("post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const ids = (savedRows ?? []).map((s) => s.post_id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase.from("posts").select(POST_SELECT).in("id", ids);
  if (error) throw error;
  return hydratePosts(data ?? [], userId);
}

export async function getPostsByAuthor(spaceId: string, authorId: string, viewerId: string): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("space_id", spaceId)
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return hydratePosts(data ?? [], viewerId);
}

export async function getComments(postId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*, author:profiles(*)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
