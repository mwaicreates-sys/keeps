import Link from "next/link";
import { timeAgo } from "@/lib/utils";

export type AlbumSummary = {
  id: string;
  name: string;
  count: number;
  createdAt: string;
  covers: string[];
};

/** A real collection, rendered as a collage cover — hero photo plus a strip of the next few. */
export function AlbumCard({ album }: { album: AlbumSummary }) {
  const [hero, ...rest] = album.covers;

  return (
    <Link
      href={`/collections/${album.id}`}
      className="block overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]"
    >
      <div className="aspect-[4/3] w-full bg-[#f2efe9]">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : null}
      </div>
      {rest.length > 0 && (
        <div className="grid grid-cols-3 gap-px bg-[#f2efe9]">
          {rest.slice(0, 3).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="" loading="lazy" className="h-9 w-full object-cover" />
          ))}
        </div>
      )}
      <div className="p-2.5">
        <p className="truncate text-[13px] font-semibold text-[#3a362f]">{album.name}</p>
        <p className="mt-0.5 text-[10.5px] text-[#a39d92]">
          {timeAgo(album.createdAt)} · {album.count} {album.count === 1 ? "item" : "items"}
        </p>
      </div>
    </Link>
  );
}
