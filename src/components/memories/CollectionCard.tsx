import Link from "next/link";
import { FolderHeart } from "lucide-react";

export type CollectionSummary = {
  id: string;
  name: string;
  count: number;
  cover: string | null;
};

/**
 * A "mini album" — cover image with a soft dark gradient carrying the
 * title/count, not a flat folder button. Falls back to a plain light
 * card with a small icon when the collection has no photo yet.
 */
export function CollectionCard({ collection }: { collection: CollectionSummary }) {
  return (
    <Link
      href={`/collections/${collection.id}`}
      className="relative flex h-[132px] w-[152px] shrink-0 flex-col justify-end overflow-hidden rounded-[22px] bg-[#f2efe9] shadow-[0_2px_12px_-6px_rgba(20,18,15,0.12)]"
    >
      {collection.cover ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={collection.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        </>
      ) : (
        <FolderHeart size={20} className="absolute left-3 top-3 text-[#c2ab5a]" />
      )}
      <div className="relative z-10 p-3">
        <p className={`truncate text-[15px] font-semibold ${collection.cover ? "text-white" : "text-[#3a362f]"}`}>
          {collection.name}
        </p>
        <p className={`text-[12px] ${collection.cover ? "text-white/75" : "text-[#a39d92]"}`}>
          {collection.count} {collection.count === 1 ? "memory" : "memories"}
        </p>
      </div>
    </Link>
  );
}
