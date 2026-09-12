import Link from "next/link";
import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";
import { searchSpace } from "@/services/search-server";
import { HomeHeader } from "@/components/home/HomeHeader";
import { PageIntro } from "@/components/app/PageIntro";
import { EmptyState } from "@/components/EmptyState";
import { Search as SearchIcon, Music2, FolderHeart, Gamepad2, Sparkles } from "lucide-react";

function ResultRow({
  href,
  cover,
  fallbackIcon: FallbackIcon,
  fallbackBg,
  fallbackColor,
  title,
  subtitle,
}: {
  href: string;
  cover?: string | null;
  fallbackIcon: typeof Music2;
  fallbackBg: string;
  fallbackColor: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]"
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
      ) : (
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
          style={{ backgroundColor: fallbackBg, color: fallbackColor }}
        >
          <FallbackIcon size={19} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-medium text-[#3a362f]">{title}</p>
        {subtitle && <p className="truncate text-[13px] text-[#a39d92]">{subtitle}</p>}
      </div>
    </Link>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const supabase = await createClient();

  const [results, { count: unreadCount }] = await Promise.all([
    q ? searchSpace(ctx.space.id, q) : Promise.resolve(null),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).is("read_at", null),
  ]);
  const total = results ? results.posts.length + results.songs.length + results.collections.length + results.games.length : 0;

  return (
    <div className="mx-auto max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader unreadCount={unreadCount ?? 0} />

      <PageIntro title="Search" subtitle="Posts, memories, songs, games, collections, and tags." />

      <form action="/search" className="mb-5 px-4">
        <label className="flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-[0_1px_8px_-4px_rgba(20,18,15,0.15)]">
          <SearchIcon size={19} strokeWidth={1.8} className="shrink-0 text-[#a39d92]" />
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="football, 2026, Kendrick, funny…"
            className="w-full bg-transparent text-[15px] text-[#3a362f] outline-none placeholder:text-[#a39d92]"
          />
        </label>
      </form>

      <div className="px-4">
        {!results ? (
          <EmptyState icon={SearchIcon} title="Search your space" body="Find posts, memories, songs, games, collections, and tags." />
        ) : total === 0 ? (
          <EmptyState icon={SearchIcon} title="No results" body={`Nothing matched "${q}" yet.`} />
        ) : (
          <div className="space-y-6">
            {results.posts.length > 0 && (
              <section>
                <p className="mb-2.5 text-[15px] font-semibold text-[#3a362f]">Posts &amp; Memories</p>
                <ul className="space-y-2">
                  {results.posts.map((p) => (
                    <li key={p.id}>
                      <ResultRow
                        href={`/memories/${p.id}`}
                        cover={p.cover}
                        fallbackIcon={Sparkles}
                        fallbackBg="#fdf3e0"
                        fallbackColor="#c99a2e"
                        title={p.caption || `A ${p.type}`}
                        subtitle={`${new Date(p.occurred_at).getFullYear()}`}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.songs.length > 0 && (
              <section>
                <p className="mb-2.5 text-[15px] font-semibold text-[#3a362f]">Songs</p>
                <ul className="space-y-2">
                  {results.songs.map((s) => (
                    <li key={s.post_id}>
                      <ResultRow
                        href={`/memories/${s.post_id}`}
                        cover={s.artwork_url}
                        fallbackIcon={Music2}
                        fallbackBg="#e6f2e9"
                        fallbackColor="#2f8f52"
                        title={s.title}
                        subtitle={s.artist ?? undefined}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.collections.length > 0 && (
              <section>
                <p className="mb-2.5 text-[15px] font-semibold text-[#3a362f]">Collections</p>
                <ul className="space-y-2">
                  {results.collections.map((c) => (
                    <li key={c.id}>
                      <ResultRow
                        href={`/collections/${c.id}`}
                        cover={c.cover}
                        fallbackIcon={FolderHeart}
                        fallbackBg="#faf1e2"
                        fallbackColor="#a3742b"
                        title={c.name}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.games.length > 0 && (
              <section>
                <p className="mb-2.5 text-[15px] font-semibold text-[#3a362f]">Games</p>
                <ul className="space-y-2">
                  {results.games.map((g) => (
                    <li key={g.id}>
                      <ResultRow
                        href="/play"
                        fallbackIcon={Gamepad2}
                        fallbackBg="#eaeafb"
                        fallbackColor="#5457c7"
                        title={g.topic}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
