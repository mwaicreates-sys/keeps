import Link from "next/link";
import { getSessionContext } from "@/services/session";
import { getMemories } from "@/services/posts-server";
import { createClient } from "@/lib/supabase/server";
import { MemoryCard } from "@/components/MemoryCard";
import { EmptyState } from "@/components/EmptyState";
import { Archive, FolderHeart } from "lucide-react";

const CATEGORIES = ["trip", "funny", "football", "music", "milestone"];

export default async function MemoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; category?: string; q?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const [memories, supabase] = await Promise.all([
    getMemories(ctx.space.id, ctx.userId, {
      year: params.year ? Number(params.year) : undefined,
      category: params.category,
      q: params.q,
      tag: params.tag,
    }),
    createClient(),
  ]);

  const { data: collections } = await supabase
    .from("collections")
    .select("*")
    .eq("space_id", ctx.space.id)
    .order("created_at", { ascending: false });

  const years = Array.from(
    new Set((await getMemories(ctx.space.id, ctx.userId, {})).map((p) => new Date(p.occurred_at).getFullYear()))
  ).sort((a, b) => b - a);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-3xl italic">Memories</h1>
          <p className="text-sm text-ink-soft">Everything worth keeping, in one archive.</p>
        </div>
      </div>

      {!!collections?.length && (
        <div className="no-scrollbar mb-6 flex gap-3 overflow-x-auto pb-1">
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.id}`}
              className="flex w-36 shrink-0 flex-col gap-2 rounded-2xl border border-line bg-paper-raised p-3"
            >
              <FolderHeart size={18} className="text-gold" />
              <p className="truncate text-sm font-medium">{c.name}</p>
            </Link>
          ))}
        </div>
      )}

      <form className="mb-6 flex flex-wrap items-center gap-2 text-sm" action="/memories">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Search memories…"
          className="min-w-[160px] flex-1 rounded-full border border-line bg-paper-raised px-4 py-2 outline-none focus:border-accent"
        />
        <select name="year" defaultValue={params.year ?? ""} className="rounded-full border border-line bg-paper-raised px-3 py-2">
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select name="category" defaultValue={params.category ?? ""} className="rounded-full border border-line bg-paper-raised px-3 py-2">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button className="rounded-full bg-ink px-4 py-2 text-paper">Filter</button>
      </form>

      {memories.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="No memories saved yet"
          body="Tap the sparkle on any Drop to keep it here forever."
        />
      ) : (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
          {memories.map((post) => (
            <MemoryCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
