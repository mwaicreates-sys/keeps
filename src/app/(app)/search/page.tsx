import Link from "next/link";
import { getSessionContext } from "@/services/session";
import { searchSpace } from "@/services/search-server";
import { EmptyState } from "@/components/EmptyState";
import { SearchIcon } from "lucide-react";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const results = q ? await searchSpace(ctx.space.id, q) : null;
  const total = results ? results.posts.length + results.songs.length + results.collections.length + results.games.length : 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-4 font-display text-2xl">Search</h1>
      <form action="/search" className="mb-6">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="football, 2026, Kendrick, funny…"
          className="w-full rounded-full border border-line bg-paper-raised px-4 py-3 text-sm outline-none focus:border-accent"
        />
      </form>

      {!results ? (
        <p className="text-center text-sm text-ink-soft">Search posts, memories, songs, games, collections, and tags.</p>
      ) : total === 0 ? (
        <EmptyState icon={SearchIcon} title="No results" body={`Nothing matched "${q}" yet.`} />
      ) : (
        <div className="space-y-6">
          {results.posts.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">Posts &amp; Memories</p>
              <ul className="space-y-1.5">
                {results.posts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/memories/${p.id}`} className="block rounded-xl border border-line px-3 py-2 text-sm">
                      {p.caption || `A ${p.type}`} <span className="text-ink-soft">· {new Date(p.occurred_at).getFullYear()}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {results.songs.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">Songs</p>
              <ul className="space-y-1.5">
                {results.songs.map((s) => (
                  <li key={s.post_id}>
                    <Link href={`/memories/${s.post_id}`} className="block rounded-xl border border-line px-3 py-2 text-sm">
                      {s.title} <span className="text-ink-soft">· {s.artist}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {results.collections.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">Collections</p>
              <ul className="space-y-1.5">
                {results.collections.map((c) => (
                  <li key={c.id}>
                    <Link href={`/collections/${c.id}`} className="block rounded-xl border border-line px-3 py-2 text-sm">{c.name}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {results.games.length > 0 && (
            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">Games</p>
              <ul className="space-y-1.5">
                {results.games.map((g) => (
                  <li key={g.id} className="rounded-xl border border-line px-3 py-2 text-sm">{g.topic}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
