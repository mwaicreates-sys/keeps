import Link from "next/link";
import { Plus, ChevronRight, Star, MapPin, Music2, Archive, type LucideIcon } from "lucide-react";
import { getSessionContext } from "@/services/session";
import { getMemories } from "@/services/posts-server";
import { getMemoryHighlights } from "@/services/resurfacing";
import { HomeHeader } from "@/components/home/HomeHeader";
import { MemoryTileMenu } from "@/components/memories/MemoryTileMenu";
import { EmptyState } from "@/components/EmptyState";
import { Avatar } from "@/components/Avatar";
import type { FeedPost } from "@/lib/domain-types";

// Same top bar as Home/Search/Notifications (search/wordmark/bell) --
// Memories is part of the same light-theme, "own header" route set (see
// theme-routes.ts / HideOnHome.tsx).

const TYPE_FILTERS: { type?: string; label: string; icon?: LucideIcon }[] = [
  { type: undefined, label: "All" },
  { type: "photo", label: "Photos" },
  { type: "video", label: "Videos" },
  { type: "favorite", label: "Favorites", icon: Star },
  { type: "activity", label: "Places", icon: MapPin },
];

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function TileVisual({ post }: { post: FeedPost }) {
  const photo = post.media.find((m) => m.media_type === "photo");
  const video = post.media.find((m) => m.media_type === "video");
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo.url} alt="" loading="lazy" className="h-full w-full object-cover" />;
  }
  if (video) {
    return <video src={video.url} muted playsInline className="h-full w-full object-cover" />;
  }
  if (post.song) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#e9e4da] text-[#7c766c]">
        <Music2 size={18} />
      </div>
    );
  }
  if (post.favorite) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#fdf3e0] text-[#c99a2e]">
        <Star size={18} />
      </div>
    );
  }
  if (post.type === "activity" || post.place) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#eaf3ee] text-[#3f7a5c]">
        <MapPin size={18} />
      </div>
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#f2efe9] p-1.5 text-center text-[9.5px] font-medium leading-snug text-[#7c766c]">
      {post.caption ? `“${post.caption}”` : "A memory"}
    </div>
  );
}

function HighlightCard({
  eyebrow,
  title,
  subtitle,
  coverUrl,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  coverUrl: string | null;
}) {
  return (
    <div
      className="relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-2xl p-4 text-white"
      style={{ backgroundColor: "#2a2620" }}
    >
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
      <p className="relative text-[10px] font-bold uppercase tracking-wide text-white/80">{eyebrow}</p>
      <div className="relative">
        <p className="font-display text-xl leading-tight">{title}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-white/75">{subtitle}</p>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/90 text-[#3a362f]">
            <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function MemoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; author?: string; sort?: string }>;
}) {
  const { type, author, sort } = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const [posts, highlights] = await Promise.all([
    getMemories(ctx.space.id, ctx.userId, { type, authorId: author }),
    getMemoryHighlights(ctx.space.id),
  ]);
  const orderedPosts = sort === "oldest" ? [...posts].reverse() : posts;

  const groups: { label: string; posts: FeedPost[] }[] = [];
  for (const post of orderedPosts) {
    const label = monthLabel(post.occurred_at);
    const group = groups.find((g) => g.label === label);
    if (group) group.posts.push(post);
    else groups.push({ label, posts: [post] });
  }

  function filterHref(overrides: { type?: string; author?: string; sort?: string }) {
    const merged = { type, author, sort, ...overrides };
    const params = new URLSearchParams();
    if (merged.type) params.set("type", merged.type);
    if (merged.author) params.set("author", merged.author);
    if (merged.sort) params.set("sort", merged.sort);
    const qs = params.toString();
    return qs ? `/memories?${qs}` : "/memories";
  }

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader unreadCount={ctx.unreadCount} />

      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-1">
        <div>
          <p className="font-display text-[26px] font-bold leading-tight text-[#211c16]">Memories</p>
          <p className="mt-0.5 text-[12.5px] text-[#a39d92]">Moments that matter, always with you.</p>
        </div>
        <Link
          href="/drop"
          className="flex shrink-0 items-center gap-1 rounded-full bg-[#3a362f] px-3.5 py-2 text-[12.5px] font-semibold text-white"
        >
          <Plus size={14} strokeWidth={2.5} /> Add
        </Link>
      </div>

      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {TYPE_FILTERS.map(({ type: t, label, icon: Icon }) => {
          const active = type === t;
          return (
            <Link
              key={label}
              href={filterHref({ type: active ? undefined : t })}
              className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium ${
                active ? "bg-[#3a362f] text-white" : "bg-white text-[#7c766c]"
              }`}
            >
              {Icon && <Icon size={12} />}
              {label}
            </Link>
          );
        })}
        {ctx.members.map((member) => {
          const active = author === member.id;
          return (
            <Link
              key={member.id}
              href={filterHref({ author: active ? undefined : member.id })}
              className={`flex shrink-0 items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 text-[12px] font-medium ${
                active ? "bg-[#3a362f] text-white" : "bg-white text-[#7c766c]"
              }`}
            >
              <Avatar name={member.display_name} url={member.avatar_url} size={16} />
              {member.display_name.split(" ")[0]}
            </Link>
          );
        })}
      </div>

      {(highlights.onThisDay || highlights.recentlyAdded) && (
        <div className="mb-5 grid grid-cols-2 gap-3 px-4">
          {highlights.onThisDay && (
            <HighlightCard
              eyebrow="On this day"
              title={
                highlights.onThisDay.years === 1 ? (
                  <>
                    Same day
                    <br />
                    last year
                  </>
                ) : (
                  <>
                    Same day
                    <br />
                    {highlights.onThisDay.years} years ago
                  </>
                )
              }
              subtitle={`${dayLabel(highlights.onThisDay.date)} · ${highlights.onThisDay.count} ${
                highlights.onThisDay.count === 1 ? "memory" : "memories"
              }`}
              coverUrl={highlights.onThisDay.coverUrl}
            />
          )}
          {highlights.recentlyAdded && (
            <HighlightCard
              eyebrow="Recently added"
              title={
                <>
                  Your latest
                  <br />
                  memories
                </>
              }
              subtitle={`${highlights.recentlyAdded.count} new item${highlights.recentlyAdded.count === 1 ? "" : "s"}`}
              coverUrl={highlights.recentlyAdded.coverUrl}
            />
          )}
        </div>
      )}

      <div className="px-4">
        {orderedPosts.length === 0 ? (
          <EmptyState
            icon={Archive}
            title="No memories yet"
            body={
              type || author
                ? "Nothing matches this filter yet."
                : "Save your favorite Drops here to keep them close."
            }
            action={
              <Link href="/drop" className="rounded-full bg-[#3a362f] px-4 py-2 text-[12.5px] font-semibold text-white">
                Add a memory
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            {groups.map((group, i) => (
              <section key={group.label}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-[#3a362f]">{group.label}</p>
                  {i === 0 && (
                    <details className="relative">
                      <summary className="cursor-pointer list-none select-none text-[12px] font-medium text-[#a39d92]">
                        {sort === "oldest" ? "Oldest ⌄" : "Latest ⌄"}
                      </summary>
                      <div className="absolute right-0 z-10 mt-1 w-28 overflow-hidden rounded-xl bg-white py-1 shadow-[0_8px_24px_-6px_rgba(20,18,15,0.25)] ring-1 ring-black/5">
                        <Link
                          href={filterHref({ sort: undefined })}
                          className="block px-3 py-1.5 text-[12px] font-medium text-[#3a362f] hover:bg-[#f2efe9]"
                        >
                          Latest
                        </Link>
                        <Link
                          href={filterHref({ sort: "oldest" })}
                          className="block px-3 py-1.5 text-[12px] font-medium text-[#3a362f] hover:bg-[#f2efe9]"
                        >
                          Oldest
                        </Link>
                      </div>
                    </details>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {group.posts.map((post) => (
                    <Link key={post.id} href={`/memories/${post.id}`} className="block">
                      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-[#f2efe9]">
                        <TileVisual post={post} />
                      </div>
                      <div className="mt-1 flex items-start justify-between gap-0.5">
                        <div className="min-w-0">
                          <p className="truncate text-[10.5px] font-semibold leading-tight text-[#3a362f]">
                            {post.caption || labelFor(post)}
                          </p>
                          <p className="truncate text-[9px] text-[#a39d92]">{dayLabel(post.occurred_at)}</p>
                        </div>
                        <MemoryTileMenu postId={post.id} />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function labelFor(post: FeedPost) {
  if (post.song) return post.song.title;
  if (post.favorite) return post.favorite.item_name;
  if (post.place) return post.place;
  const icons: Record<string, string> = { photo: "Photo", video: "Video", text: "Note" };
  return icons[post.type] ?? "Memory";
}
