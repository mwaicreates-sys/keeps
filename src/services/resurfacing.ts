import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types";

export type Resurfaced = {
  label: string;
  post: Tables<"posts"> & { author: Tables<"profiles">; media: Pick<Tables<"post_media">, "url">[] };
};

/**
 * Only ever resurfaces real, previously-stored posts — never fabricated
 * content. "On this day" windows check the *day of year*, others check an
 * elapsed-time threshold.
 */
export async function getResurfaced(spaceId: string): Promise<Resurfaced[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("*, author:profiles!posts_author_id_fkey(*), media:post_media(url)")
    .eq("space_id", spaceId)
    .eq("saved_to_memories", true)
    .order("occurred_at", { ascending: true });

  const posts = (data ?? []) as (Tables<"posts"> & { author: Tables<"profiles">; media: { url: string }[] })[];
  if (posts.length === 0) return [];

  const now = new Date();
  const results: Resurfaced[] = [];

  const onThisDay = posts.find((p) => {
    const d = new Date(p.occurred_at);
    return d.getMonth() === now.getMonth() && d.getDate() === now.getDate() && d.getFullYear() !== now.getFullYear();
  });
  if (onThisDay) {
    const years = now.getFullYear() - new Date(onThisDay.occurred_at).getFullYear();
    results.push({ label: `${years} year${years > 1 ? "s" : ""} ago today`, post: onThisDay });
  }

  const daysAgo = (p: Tables<"posts">) =>
    Math.floor((now.getTime() - new Date(p.occurred_at).getTime()) / 86_400_000);

  for (const [label, target] of [
    ["30 days ago", 30],
    ["90 days ago", 90],
  ] as const) {
    const match = posts.find((p) => Math.abs(daysAgo(p) - target) <= 1);
    if (match) results.push({ label, post: match });
  }

  if (posts[0]) results.push({ label: "Your first Drop", post: posts[0] });
  const firstSong = posts.find((p) => p.type === "song");
  if (firstSong && firstSong !== posts[0]) results.push({ label: "Your first shared song", post: firstSong });

  return results.slice(0, 4);
}

export type MemoryHighlights = {
  onThisDay: { coverUrl: string | null; count: number; years: number; date: string } | null;
  recentlyAdded: { coverUrl: string | null; count: number } | null;
};

/**
 * The Memories page's two showcase cards. Distinct from getResurfaced()
 * above (which picks one representative post per Home's compact rail) --
 * these need real counts ("6 memories", "12 new items"), not just a
 * single label + post.
 */
export async function getMemoryHighlights(spaceId: string): Promise<MemoryHighlights> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("occurred_at, created_at, media:post_media(url)")
    .eq("space_id", spaceId)
    .eq("saved_to_memories", true)
    .order("occurred_at", { ascending: false });

  const posts = (data ?? []) as { occurred_at: string; created_at: string; media: { url: string }[] }[];
  if (posts.length === 0) return { onThisDay: null, recentlyAdded: null };

  const now = new Date();
  const sameDay = posts
    .filter((p) => {
      const d = new Date(p.occurred_at);
      return d.getMonth() === now.getMonth() && d.getDate() === now.getDate() && d.getFullYear() !== now.getFullYear();
    })
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  const top = sameDay[0];
  const onThisDay = top
    ? {
        coverUrl: top.media[0]?.url ?? null,
        count: sameDay.length,
        years: now.getFullYear() - new Date(top.occurred_at).getFullYear(),
        date: top.occurred_at,
      }
    : null;

  const THIRTY_DAYS_MS = 30 * 86_400_000;
  const recent = posts.filter((p) => now.getTime() - new Date(p.created_at).getTime() <= THIRTY_DAYS_MS);
  const newestByCreated = [...posts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
  const recentlyAdded =
    recent.length > 0 ? { coverUrl: newestByCreated?.media[0]?.url ?? null, count: recent.length } : null;

  return { onThisDay, recentlyAdded };
}

export type DropInspiration = {
  recentSong: { title: string; artist: string | null; artworkUrl: string | null } | null;
  recentCaption: string | null;
  recentPlace: string | null;
  recentActivityPhoto: string | null;
  recentFavoritePhotos: string[];
};

/**
 * Real scraps of this space's own recent Drops, used only as small preview
 * hints on the Drop page's type cards (a real song's artwork as the Song
 * card's background, a real caption on the Text card, …) — never
 * fabricated placeholder content. Each field is independently null/empty
 * when there's nothing real to show yet, so a brand-new space just gets
 * plain cards.
 */
export async function getDropInspiration(spaceId: string): Promise<DropInspiration> {
  const supabase = await createClient();
  const [{ data: songRow }, { data: textRow }, { data: activityRow }, { data: favoriteRows }] = await Promise.all([
    supabase
      .from("posts")
      .select("post_song_metadata!inner(title, artist, artwork_url)")
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
    supabase
      .from("posts")
      .select("place, media:post_media(url)")
      .eq("space_id", spaceId)
      .eq("type", "activity")
      .not("place", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("posts")
      .select("id, post_media!inner(url)")
      .eq("space_id", spaceId)
      .eq("type", "favorite")
      .eq("post_media.media_type", "photo")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const song =
    (songRow?.post_song_metadata as { title: string; artist: string | null; artwork_url: string | null } | null) ?? null;
  const activityMedia = (activityRow?.media as { url: string }[] | null) ?? [];
  const recentFavoritePhotos = (favoriteRows ?? [])
    .flatMap((r) => ((r.post_media as { url: string }[] | null) ?? []).map((m) => m.url))
    .slice(0, 3);

  return {
    recentSong: song ? { title: song.title, artist: song.artist, artworkUrl: song.artwork_url } : null,
    recentCaption: textRow?.caption ?? null,
    recentPlace: (activityRow?.place as string | null | undefined) ?? null,
    recentActivityPhoto: activityMedia[0]?.url ?? null,
    recentFavoritePhotos,
  };
}
