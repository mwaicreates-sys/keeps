"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

/**
 * One full-width search bar plus a small filter toggle — the year/tag
 * selects it reveals are today's stand-in for the "advanced filters open
 * a sheet later" ask; wiring an actual bottom-sheet is future work, this
 * keeps the existing year/tag filtering reachable without three desktop
 * dropdowns sitting in the primary row.
 */
export function MemoriesSearchBar({
  q,
  year,
  category,
  type,
  years,
  categories,
}: {
  q?: string;
  year?: string;
  category?: string;
  type?: string;
  years: number[];
  categories: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 px-4">
      <form action="/memories" className="flex items-center gap-2">
        {type && <input type="hidden" name="type" value={type} />}
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-4 py-3 shadow-[0_1px_8px_-4px_rgba(20,18,15,0.15)]">
          <Search size={19} strokeWidth={1.8} className="shrink-0 text-[#a39d92]" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search memories…"
            className="w-full min-w-0 bg-transparent text-[15px] text-[#3a362f] outline-none placeholder:text-[#a39d92]"
          />
        </label>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="More filters"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[#3a362f] shadow-[0_1px_8px_-4px_rgba(20,18,15,0.15)]"
        >
          <SlidersHorizontal size={19} strokeWidth={1.8} />
        </button>
      </form>

      {open && (
        <form action="/memories" className="mt-2 flex gap-2">
          {type && <input type="hidden" name="type" value={type} />}
          {q && <input type="hidden" name="q" value={q} />}
          <select
            name="year"
            defaultValue={year ?? ""}
            className="flex-1 rounded-full bg-white px-3 py-2.5 text-[13.5px] text-[#3a362f] outline-none"
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue={category ?? ""}
            className="flex-1 rounded-full bg-white px-3 py-2.5 text-[13.5px] text-[#3a362f] outline-none"
          >
            <option value="">All tags</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button className="shrink-0 rounded-full bg-[#3a362f] px-4 text-[13.5px] font-medium text-white">Apply</button>
        </form>
      )}
    </div>
  );
}
