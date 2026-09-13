import Link from "next/link";
import {
  Search as SearchIcon,
  Music2,
  FolderHeart,
  Sparkles,
  Image as ImageIcon,
  Video,
  Type as TypeIcon,
  MapPin,
  Star,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";
import { getSessionContext } from "@/services/session";
import { searchSpace, gameHref, getSearchShowcase, type SearchResultType } from "@/services/search-server";
import { EmptyState } from "@/components/EmptyState";
import { HomeHeader } from "@/components/home/HomeHeader";
import { SearchField } from "@/components/search/SearchField";
import { SearchShowcase } from "@/components/search/SearchShowcase";
import { SearchShortcuts } from "@/components/search/SearchShortcuts";

// Same top bar as Home/Memories/Drop/Profile (search/wordmark/bell) --
// this page's own search field lives below it, in the body.

const TYPE_FILTERS: { type?: SearchResultType; label: string }[] = [
  { type: undefined, label: "All" },
  { type: "photo", label: "Photos" },
  { type: "video", label: "Video" },
  { type: "song", label: "Songs" },
  { type: "text", label: "Text" },
  { type: "activity", label: "Activity" },
  { type: "favorite", label: "Favorites" },
  { type: "collection", label: "Collections" },
  { type: "game", label: "Games" },
];

const TYPE_ICON: Record<string, LucideIcon> = {
  photo: ImageIcon,
  video: Video,
  song: Music2,
  text: TypeIcon,
  activity: MapPin,
  favorite: Star,
};

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
  fallbackIcon: LucideIcon;
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

function ResultSection({
  icon: Icon,
  title,
  count,
  seeAllHref,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  seeAllHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#3a362f]">
          <Icon size={14} className="text-[#a39d92]" /> {title} <span className="text-[#a39d92]">{count}</span>
        </p>
        {seeAllHref && (
          <Link href={seeAllHref} className="text-[11.5px] font-medium text-[#a39d92]">
            See all
          </Link>
        )}
      </div>
      <ul className="space-y-1.5">{children}</ul>
    </section>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: SearchResultType }>;
}) {
  const { q = "", type } = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const [results, showcase] = await Promise.all([
    q ? searchSpace(ctx.space.id, q, type) : Promise.resolve(null),
    q ? Promise.resolve(null) : getSearchShowcase(ctx.space.id),
  ]);
  const total = results ? results.posts.length + results.songs.length + results.collections.length + results.games.length : 0;

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader minimal />

      <div className="px-4 pb-3 pt-1">
        {!q && showcase && <SearchShowcase photo={showcase.photo} song={showcase.song} text={showcase.text} />}
        <SearchField initialQuery={q} />
      </div>

      {q && (
        <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {TYPE_FILTERS.map(({ type: t, label }) => {
            const active = type === t || (!type && !t);
            const params = new URLSearchParams({ q });
            if (t) params.set("type", t);
            return (
              <Link
                key={label}
                href={`/search?${params.toString()}`}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium ${
                  active ? "bg-[#3a362f] text-white" : "bg-white text-[#7c766c]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}

      <div className="px-4">
        {!q ? (
          <SearchShortcuts q={q} activeType={type} />
        ) : total === 0 ? (
          <div className="space-y-5">
            <EmptyState icon={SearchIcon} title="No results" body={`Nothing matched "${q}" yet.`} />
            <SearchShortcuts q="" />
          </div>
        ) : (
          <div className="space-y-5">
            {results!.posts.length > 0 && (
              <ResultSection
                icon={TYPE_ICON[results!.posts[0].type] ?? Sparkles}
                title={type ? TYPE_FILTERS.find((f) => f.type === type)?.label ?? "Memories" : "Memories"}
                count={results!.posts.length}
                seeAllHref={`/search?q=${encodeURIComponent(q)}&type=${results!.posts[0].type}`}
              >
                {results!.posts.map((p) => (
                  <li key={p.id}>
                    <ResultRow
                      href={`/memories/${p.id}`}
                      cover={p.cover}
                      fallbackIcon={TYPE_ICON[p.type] ?? Sparkles}
                      fallbackBg="#fdf3e0"
                      fallbackColor="#c99a2e"
                      title={p.caption || `A ${p.type}`}
                      subtitle={`${new Date(p.occurred_at).getFullYear()}`}
                    />
                  </li>
                ))}
              </ResultSection>
            )}

            {results!.songs.length > 0 && (
              <ResultSection icon={Music2} title="Songs" count={results!.songs.length} seeAllHref={`/search?q=${encodeURIComponent(q)}&type=song`}>
                {results!.songs.map((s) => (
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

            {results!.collections.length > 0 && (
              <ResultSection
                icon={FolderHeart}
                title="Collections"
                count={results!.collections.length}
                seeAllHref={`/search?q=${encodeURIComponent(q)}&type=collection`}
              >
                {results!.collections.map((c) => (
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

            {results!.games.length > 0 && (
              <ResultSection icon={Gamepad2} title="Games" count={results!.games.length} seeAllHref={`/search?q=${encodeURIComponent(q)}&type=game`}>
                {results!.games.map((g) => (
                  <li key={g.id}>
                    <ResultRow
                      href={gameHref(g.game_type)}
                      fallbackIcon={Gamepad2}
                      fallbackBg="#eaeafb"
                      fallbackColor="#5457c7"
                      title={g.topic}
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
