"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, X } from "lucide-react";

/**
 * Debounced, URL-driven search field: typing updates the `q` query
 * param 300ms after the last keystroke, which re-runs the (server
 * component) search page with a soft navigation -- no full reload, no
 * flash, and the header/shortcuts around it never remount. Keeps
 * whatever `type` scope is already active in the URL.
 */
export function SearchField({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `/search?${qs}` : "/search");
    }, 300);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full bg-white px-4 py-3 shadow-[0_1px_8px_-4px_rgba(20,18,15,0.15)]">
      <SearchIcon size={19} strokeWidth={2} className="shrink-0 text-[#a39d92]" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        placeholder="Search memories, songs, posts, games, tags…"
        className="w-full min-w-0 bg-transparent text-[15px] text-[#3a362f] outline-none placeholder:text-[#a39d92]"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e7dcc9] text-[#7c766c]"
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
    </label>
  );
}
