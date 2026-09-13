import Link from "next/link";
import { ArrowLeft, Search as SearchIcon, Music2, FolderHeart, Sparkles } from "lucide-react";
import { getSessionContext } from "@/services/session";
import { searchSpace } from "@/services/search-server";
import { EmptyState } from "@/components/EmptyState";

// Search has its own header — not the Home top bar (that only appears
// on Home). Just a back arrow + the search field itself.

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
      className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]"
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
      ) : (
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
          style={{ backgroundColor: fallbackBg, color: fallbackColor }}
        >
          <FallbackIcon size={16} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[#3a362f]">{title}</p>
        {subtitle && <p className="truncate text-[11px] text-[#a39d92]">{subtitle}</p>}
      </div>
    </Link>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[12.5px] font-semibold text-[#3a362f]">{title}</p>
      <ul className="space-y-1.5">{children}</ul>
    </section>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const results = q ? await searchSpace(ctx.space.id, q) : null;
  const total = results ? results.posts.length + results.songs.length + results.collections.length : 0;

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <div className="flex items-center gap-3 px-3 pb-3 pt-2">
        <Link href="/home" aria-label="Back" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#3a362f]">
          <ArrowLeft size={24} strokeWidth={2} />
        </Link>
        <form action="/search" className="min-w-0 flex-1">
          <label className="flex items-center gap-2.5 rounded-full bg-white px-4 py-3 shadow-[0_1px_8px_-4px_rgba(20,18,15,0.15)]">
            <SearchIcon size={19} strokeWidth={2} className="shrink-0 text-[#a39d92]" />
            <input
              name="q"
              defaultValue={q}
              autoFocus
              placeholder="football, 2026, Kendrick, funny…"
              className="w-full min-w-0 bg-transparent text-[16px] text-[#3a362f] outline-none placeholder:text-[#a39d92]"
            />
          </label>
        </form>
      </div>

      <div className="px-4">
        {!results ? (
          <EmptyState icon={SearchIcon} title="Search your space" body="Find posts, memories, songs, and collections." />
        ) : total === 0 ? (
          <EmptyState icon={SearchIcon} title="No results" body={`Nothing matched "${q}" yet.`} />
        ) : (
          <div className="space-y-5">
            {results.posts.length > 0 && (
              <ResultSection title="Posts & Memories">
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
              </ResultSection>
            )}

            {results.songs.length > 0 && (
              <ResultSection title="Songs">
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
              </ResultSection>
            )}

            {results.collections.length > 0 && (
              <ResultSection title="Collections">
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
              </ResultSection>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
