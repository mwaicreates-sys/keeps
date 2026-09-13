import { Image as ImageIcon, Music2, Type as TypeIcon } from "lucide-react";

/**
 * Three small layered cards previewing what's searchable, built from
 * real recent content (a real photo, a real song, a real caption) --
 * never fabricated. Purely a visual cue; tapping does nothing special,
 * the search field below is the actual interface.
 */
export function SearchShowcase({
  photo,
  song,
  text,
}: {
  photo: { url: string } | null;
  song: { title: string; artist: string | null } | null;
  text: { caption: string } | null;
}) {
  if (!photo && !song && !text) return null;

  return (
    <div className="relative mx-auto mb-4 flex h-[104px] w-full max-w-[280px] items-center justify-center px-4">
      {photo && (
        <div className="absolute left-4 top-1 h-[92px] w-[76px] -rotate-6 overflow-hidden rounded-2xl border-2 border-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-3">
            <span className="flex items-center gap-1 text-[8px] font-medium text-white/90">
              <ImageIcon size={8} /> Memories
            </span>
          </div>
        </div>
      )}

      {song && (
        <div className="relative z-10 flex h-[100px] w-[84px] flex-col justify-between rounded-2xl border-2 border-white bg-[#211c16] p-2 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.4)]">
          <Music2 size={14} className="text-[#d9a655]" />
          <div>
            <p className="truncate text-[9px] font-semibold leading-tight text-white">{song.title}</p>
            {song.artist && <p className="truncate text-[8px] text-white/60">{song.artist}</p>}
          </div>
        </div>
      )}

      {text && (
        <div className="absolute right-4 top-2 h-[88px] w-[76px] rotate-6 overflow-hidden rounded-2xl border-2 border-white bg-[#fdf3e0] p-2 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)]">
          <TypeIcon size={12} className="text-[#c99a2e]" />
          <p className="mt-1.5 line-clamp-3 text-[8.5px] italic leading-snug text-[#5c574c]">&ldquo;{text.caption}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
