import Link from "next/link";
import { getSessionContext } from "@/services/session";
import { getMemories } from "@/services/posts-server";
import { getResurfaced } from "@/services/resurfacing";
import { createClient } from "@/lib/supabase/server";
import { HomeHeader } from "@/components/home/HomeHeader";
import { PageIntro } from "@/components/app/PageIntro";
import { MemoryTile } from "@/components/memories/MemoryTile";
import { CollectionCard, type CollectionSummary } from "@/components/memories/CollectionCard";
import { MemoriesSearchBar } from "@/components/memories/MemoriesSearchBar";
import { EmptyState } from "@/components/EmptyState";
import { Archive, ChevronRight } from "lucide-react";

const TAGS = ["trip", "funny", "football", "music", "milestone"];

const TYPE_CHIPS = [
  { type: undefined, label: "All" },
  { type: "photo", label: "Photos" },
  { type: "video", label: "Videos" },
  { type: "song", label: "Songs" },
  { type: "text", label: "Text" },
  { type: "activity", label: "Activities" },
  { type: "favorite", label: "Favorites" },
] as const;

function buildHref(current: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/memories?${qs}` : "/memories";
}

export default async function MemoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; category?: string; type?: string; q?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const [memories, allMemories, resurfaced, { data: collectionsRaw }, { count: unreadCount }] = await Promise.all([
    getMemories(ctx.space.id, ctx.userId, {
      year: params.year ? Number(params.year) : undefined,
      category: params.category,
      type: params.type,
      q: params.q,
      tag: params.tag,
    }),
    getMemories(ctx.space.id, ctx.userId, {}),
    getResurfaced(ctx.space.id),
    supabase
      .from("collections")
      .select("id, name, collection_items(post_id, posts(media:post_media(url)))")
      .eq("space_id", ctx.space.id)
      .order("created_at", { ascending: false }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).is("read_at", null),
  ]);

  const years = Array.from(new Set(allMemories.map((p) => new Date(p.occurred_at).getFullYear()))).sort((a, b) => b - a);

  const collections: CollectionSummary[] = (collectionsRaw ?? []).map((c) => {
    const items = (c.collection_items ?? []) as { posts: { media: { url: string }[] | null } | null }[];
    const cover = items.map((i) => i.posts?.media?.[0]?.url).find((u): u is string => !!u) ?? null;
    return { id: c.id as string, name: c.name as string, count: items.length, cover };
  });

  const onThisDay = resurfaced.find((r) => r.label.includes("today"));

  return (
    <div className="mx-auto max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader unreadCount={unreadCount ?? 0} />

      <PageIntro title="Memories" subtitle="Everything worth keeping." />

      {collections.length > 0 && (
        <div className="no-scrollbar mb-5 flex gap-3 overflow-x-auto px-4 pb-1">
          {collections.map((c) => (
            <CollectionCard key={c.id} collection={c} />
          ))}
        </div>
      )}

      <MemoriesSearchBar q={params.q} year={params.year} category={params.category} type={params.type} years={years} categories={TAGS} />

      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {TYPE_CHIPS.map(({ type, label }) => {
          const active = (params.type ?? undefined) === type;
          return (
            <Link
              key={label}
              href={buildHref(params, { type })}
              className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium ${
                active ? "bg-[#3a362f] text-white" : "bg-white text-[#7c766c]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {onThisDay && (
        <Link
          href={`/memories/${onThisDay.post.id}`}
          className="relative mx-4 mb-5 block h-44 overflow-hidden rounded-[24px] shadow-[0_4px_20px_-8px_rgba(20,18,15,0.25)]"
        >
          {onThisDay.post.media[0]?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={onThisDay.post.media[0].url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#4a453d] to-[#211c16]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-[11.5px] font-bold uppercase tracking-wide text-white/70">On this day</p>
              <p className="text-[22px] font-bold leading-tight text-white">{onThisDay.label.replace(" today", "")}</p>
              <p className="truncate text-[14px] text-white/85">{onThisDay.post.caption || "A memory worth revisiting"}</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm">
              <ChevronRight size={19} />
            </span>
          </div>
        </Link>
      )}

      <div className="px-4">
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[19px] font-bold text-[#3a362f]">All memories</p>
        </div>

        {memories.length === 0 ? (
          <EmptyState icon={Archive} title="No memories saved yet" body="Tap the sparkle on any Drop to keep it here forever." />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {memories.map((post) => (
              <MemoryTile key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
