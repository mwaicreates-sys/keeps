"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, Music2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { searchTasteArtists, saveTasteProfile } from "@/services/taste-profile-client";
import { MIN_TASTE_ARTISTS, TASTE_GENRE_CHIPS, type TasteArtist } from "@/lib/play-taste";
import type { PlayItem } from "@/services/play-providers/types";

type Step = "intro" | "artists" | "genres" | "done";

function toTaste(item: PlayItem): TasteArtist {
  return { mbid: item.id, name: item.title, imageUrl: item.imageUrl };
}

/**
 * "Tune your Play" -- a ~30-60 second, entirely visual taste seed.
 * Tap a few artists you already like, optionally a couple of genre
 * chips, done. Not a questionnaire: no text fields, no rankings, no
 * "favorite of all time" questions -- see the product spec this
 * implements verbatim in its section headers.
 */
export function TunePlay({
  initialArtists,
  initialGenres,
  editing,
}: {
  initialArtists: TasteArtist[];
  initialGenres: string[];
  /** true when opened from Play Preferences on an already-tuned space --
   * skips the intro screen and goes straight to editing. */
  editing?: boolean;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [step, setStep] = useState<Step>(editing ? "artists" : "intro");
  const [selected, setSelected] = useState<TasteArtist[]>(initialArtists);
  const [genres, setGenres] = useState<string[]>(initialGenres);
  const [suggestions, setSuggestions] = useState<PlayItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlayItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbort = useRef<AbortController | null>(null);

  const selectedIds = new Set(selected.map((a) => a.mbid));

  // Adapts as soon as the user starts tapping: refetch suggestions
  // seeded by the two most recently picked artists' real MusicBrainz
  // tags (see /api/play/tune-suggestions), excluding anything already
  // shown or picked. Cold-start (nothing picked yet) uses the curated
  // mainstream list instead of raw/random provider content.
  useEffect(() => {
    if (step !== "artists") return;
    let cancelled = false;
    setLoadingSuggestions(true);
    const basedOn = selected.slice(-2).map((a) => a.mbid);
    const exclude = [...selectedIds, ...suggestions.map((s) => s.id)];
    const params = new URLSearchParams();
    if (basedOn.length) params.set("basedOn", basedOn.join(","));
    if (exclude.length) params.set("exclude", exclude.slice(0, 40).join(","));
    fetch(`/api/play/tune-suggestions?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: { items?: PlayItem[] }) => {
        if (!cancelled) setSuggestions(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });
    return () => {
      cancelled = true;
    };
    // Only re-run when the step becomes active or the selection count
    // changes -- not on every render, and not on deselect-only churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selected.length]);

  function toggle(item: PlayItem) {
    setSelected((prev) => {
      if (prev.some((a) => a.mbid === item.id)) return prev.filter((a) => a.mbid !== item.id);
      return [...prev, toTaste(item)];
    });
  }

  function toggleGenre(g: string) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function onSearchChange(value: string) {
    setQuery(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchAbort.current?.abort(); // cancel whatever the previous keystroke started
    if (!value.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbort.current = controller;
      const results = await searchTasteArtists(value, controller.signal);
      if (controller.signal.aborted) return; // a newer keystroke already superseded this request
      setSearchResults(results);
      setSearching(false);
    }, 350);
  }

  function skip() {
    try {
      localStorage.setItem("keeps-tune-play-skipped", "1");
    } catch {
      // best-effort only
    }
    router.push("/play");
  }

  async function finish() {
    setSaving(true);
    const ok = await saveTasteProfile({ artists: selected, genres });
    setSaving(false);
    if (!ok) {
      show("Couldn't save your picks -- try again.", "error");
      return;
    }
    try {
      localStorage.removeItem("keeps-tune-play-skipped");
    } catch {
      // best-effort only
    }
    setStep("done");
  }

  const displayedArtists = query.trim() ? searchResults : suggestions;

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-8 pt-2">
      {step === "intro" && (
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#f2efe9] text-[#3a362f]">
            <Music2 size={26} />
          </div>
          <h1 className="text-[24px] font-bold text-[#3a362f]">Tune your Play</h1>
          <p className="mx-auto mt-2 max-w-[280px] text-[14.5px] text-[#a39d92]">
            Pick a few things you like so Play feels more like you.
          </p>
          <button
            type="button"
            onClick={() => setStep("artists")}
            className="mt-7 w-full max-w-[260px] rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98]"
          >
            Start
          </button>
          <button type="button" onClick={skip} className="mt-3 text-[13.5px] font-medium text-[#a39d92] underline underline-offset-2">
            Skip for now
          </button>
        </div>
      )}

      {step === "artists" && (
        <div>
          <h1 className="text-[20px] font-bold text-[#3a362f]">Pick at least {MIN_TASTE_ARTISTS} artists you like</h1>
          <p className="mt-1 text-[13px] text-[#a39d92]">Tap to select. Search if you don&apos;t see them below.</p>

          <div className="relative mt-3.5">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a39d92]" />
            <input
              value={query}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search artists…"
              className="w-full rounded-full bg-[#f2efe9] py-3 pl-10 pr-4 text-[14.5px] text-[#3a362f] outline-none placeholder:text-[#a39d92]"
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {displayedArtists.map((item, i) => {
              const isSelected = selectedIds.has(item.id);
              // First visible row (a 3-column grid) gets priority
              // loading; the rest lazy -- per the perf pass, not every
              // image should be marked high priority.
              const isAboveFold = i < 6;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item)}
                  className={`text-center transition ${isSelected ? "" : "opacity-95"}`}
                >
                  <div className={`relative aspect-square w-full overflow-hidden rounded-2xl bg-[#f2efe9] ${isSelected ? "ring-[3px] ring-[#3a362f]" : ""}`}>
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        loading={isAboveFold ? "eager" : "lazy"}
                        fetchPriority={isAboveFold ? "high" : "auto"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[#a39d92]">
                        <Music2 size={20} />
                      </div>
                    )}
                    {isSelected && (
                      <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#3a362f] text-white">
                        <Check size={11} />
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[11.5px] font-semibold text-[#3a362f]">{item.title}</p>
                </button>
              );
            })}
            {(loadingSuggestions || searching) &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square w-full animate-pulse rounded-2xl bg-[#f2efe9]" />
              ))}
          </div>

          <div className="sticky bottom-3 mt-5 rounded-2xl bg-white/90 p-3 shadow-[0_2px_16px_-4px_rgba(20,18,15,0.18)] backdrop-blur">
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <span className="text-[#a39d92]">Selected</span>
              <span className="font-bold text-[#3a362f]">{selected.length}</span>
            </div>
            <button
              type="button"
              onClick={() => setStep("genres")}
              disabled={selected.length < MIN_TASTE_ARTISTS}
              className="w-full rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
            >
              Continue
            </button>
            {!editing && (
              <button type="button" onClick={skip} className="mt-2 w-full text-center text-[12.5px] font-medium text-[#a39d92] underline underline-offset-2">
                Skip for now
              </button>
            )}
          </div>
        </div>
      )}

      {step === "genres" && (
        <div>
          <h1 className="text-[20px] font-bold text-[#3a362f]">Want to fine-tune it?</h1>
          <p className="mt-1 text-[13px] text-[#a39d92]">Optional -- tap anything that fits, or skip straight to done.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {TASTE_GENRE_CHIPS.map((g) => {
              const isSelected = genres.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  className={`rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${
                    isSelected ? "bg-[#3a362f] text-white" : "bg-[#f2efe9] text-[#3a362f]"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={finish}
            disabled={saving}
            className="mt-7 w-full rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Done"}
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#e6f2e9] text-[#2f8f52]">
            <Check size={26} />
          </div>
          <h1 className="text-[22px] font-bold text-[#3a362f]">Your Play is ready.</h1>
          <button
            type="button"
            onClick={() => router.push("/play")}
            className="mt-7 w-full max-w-[260px] rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98]"
          >
            Start playing
          </button>
        </div>
      )}
    </div>
  );
}
