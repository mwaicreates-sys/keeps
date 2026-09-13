import { ExternalLink, Music2 } from "lucide-react";
import type { LinkPreview } from "@/services/link-preview-client";

/**
 * The polished result once a pasted link resolves — replaces the raw URL
 * input so the link itself never stays visually dominant. Used by both
 * the Music composer (song link) and the Favorite composer (any link).
 */
export function LinkPreviewCard({ preview }: { preview: LinkPreview }) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-[22px] bg-[#f7f5f1] p-3"
    >
      {preview.artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.artworkUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-[#e9e4da]">
          <Music2 size={22} className="text-[#7c766c]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight text-[#3a362f]">{preview.title}</p>
        {preview.subtitle && <p className="truncate text-[13px] font-medium leading-snug text-[#7c766c]">{preview.subtitle}</p>}
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#a39d92]">
          {preview.source} <ExternalLink size={11} />
        </p>
      </div>
    </a>
  );
}
