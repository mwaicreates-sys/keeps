import { createClient } from "@/lib/supabase/server";

export type AlbumSummary = {
  id: string;
  name: string;
  count: number;
  createdAt: string;
  covers: string[];
};

/** Every album (collection) in this space, with real cover photos pulled
 * from its member posts' own media — never a placeholder image. */
export async function getAlbums(spaceId: string): Promise<AlbumSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, name, created_at, collection_items(posts(media:post_media(url)))")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((c) => {
    const items = (c.collection_items ?? []) as { posts: { media: { url: string }[] | null } | null }[];
    const covers = items.map((i) => i.posts?.media?.[0]?.url).filter((u): u is string => !!u);
    return { id: c.id as string, name: c.name as string, count: items.length, createdAt: c.created_at as string, covers };
  });
}
