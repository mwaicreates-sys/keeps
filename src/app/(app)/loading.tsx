import { Sparkles } from "lucide-react";

/**
 * Shown only for the moment a route inside the authenticated shell is
 * still fetching its data — the header/nav shell (from layout.tsx)
 * stays mounted the whole time, only this content slot swaps in. Same
 * sparkle mark as the splash screen (src/app/loading.tsx) and every
 * page header, just smaller and inline rather than full-screen, so
 * switching pages feels like the same app pausing for a beat, not a
 * generic spinner.
 */
export default function AppLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" aria-hidden>
      <Sparkles size={28} className="animate-pulse text-[#c2ab5a] motion-reduce:animate-none" strokeWidth={1.8} />
    </div>
  );
}
