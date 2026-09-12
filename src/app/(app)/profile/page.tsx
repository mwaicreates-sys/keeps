import Link from "next/link";
import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";
import { getPostsByAuthor } from "@/services/posts-server";
import { Avatar } from "@/components/Avatar";
import { MemoryCard } from "@/components/MemoryCard";
import { EmptyState } from "@/components/EmptyState";
import { Grid3x3, ListOrdered, Star, Bookmark, Users } from "lucide-react";

const TABS = [
  { key: "posts", label: "Posts", icon: Grid3x3 },
  { key: "top5s", label: "Top 5s", icon: ListOrdered },
  { key: "favorites", label: "Favorites", icon: Star },
  { key: "saved", label: "Saved", icon: Bookmark },
] as const;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: (typeof TABS)[number]["key"] }>;
}) {
  const { tab = "posts" } = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const supabase = await createClient();

  const [{ count: memoryCount }, { count: gameCount }, posts] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("space_id", ctx.space.id).eq("saved_to_memories", true),
    supabase.from("game_sessions").select("id", { count: "exact", head: true }).eq("space_id", ctx.space.id).eq("status", "completed"),
    getPostsByAuthor(ctx.space.id, ctx.userId, ctx.userId),
  ]);

  let tabPosts = posts;
  let top5s: { id: string; topic: string; created_at: string }[] = [];

  if (tab === "favorites") {
    tabPosts = posts.filter((p) => p.type === "favorite");
  } else if (tab === "top5s") {
    const { data } = await supabase
      .from("top5_lists")
      .select("id, topic, created_at")
      .eq("space_id", ctx.space.id)
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false });
    top5s = data ?? [];
  } else if (tab === "saved") {
    const { data: savedRows } = await supabase.from("saved_items").select("post_id").eq("user_id", ctx.userId);
    const ids = new Set((savedRows ?? []).map((s) => s.post_id));
    tabPosts = posts.filter((p) => ids.has(p.id));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-start gap-4">
        <Avatar name={ctx.profile.display_name} url={ctx.profile.avatar_url} size={72} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl">{ctx.profile.display_name}</p>
          <p className="text-sm text-ink-soft">@{ctx.profile.handle}</p>
          {ctx.profile.bio && <p className="mt-1 text-sm">{ctx.profile.bio}</p>}
          <div className="mt-2 flex gap-4 text-xs text-ink-soft">
            <span><strong className="text-ink">{memoryCount ?? 0}</strong> memories</span>
            <span><strong className="text-ink">{gameCount ?? 0}</strong> games played</span>
          </div>
          {ctx.profile.interests.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ctx.profile.interests.map((i) => (
                <span key={i} className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent">{i}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Link href="/profile/us" className="mb-6 flex items-center gap-2 rounded-2xl border border-dashed border-gold/50 bg-accent-soft/30 px-4 py-3 text-sm">
        <Users size={16} className="text-gold" /> See your <strong className="mx-1">Us</strong> page
      </Link>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`/profile?tab=${key}`}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm ${
              tab === key ? "border-ink text-ink" : "border-transparent text-ink-soft"
            }`}
          >
            <Icon size={15} /> {label}
          </Link>
        ))}
      </div>

      {tab === "top5s" ? (
        top5s.length === 0 ? (
          <EmptyState icon={ListOrdered} title="No Top 5s yet" body="Play My Top 5 to start building history." />
        ) : (
          <ul className="space-y-2">
            {top5s.map((l) => (
              <li key={l.id} className="rounded-xl border border-line px-4 py-3 text-sm">{l.topic}</li>
            ))}
          </ul>
        )
      ) : tabPosts.length === 0 ? (
        <EmptyState icon={TABS.find((t) => t.key === tab)!.icon} title="Nothing here yet" />
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {tabPosts.map((post) => (
            <MemoryCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
