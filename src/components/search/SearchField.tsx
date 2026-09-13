"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";

/**
 * Debounced, URL-driven search field: typing updates the `q` query
 * param 300ms after the last keystroke, which re-runs the (server
 * component) search page with a soft navigation — no full reload, no
 * flash, and the header/shortcuts around it never remount.
 */
export function SearchField({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (value.trim()) params.set("q", value.trim());
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
        placeholder="football, 2026, Kendrick, funny…"
        className="w-full min-w-0 bg-transparent text-[16px] text-[#3a362f] outline-none placeholder:text-[#a39d92]"
      />
    </label>
  );
}
