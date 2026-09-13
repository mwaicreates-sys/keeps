import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// TMDb's API Terms of Use require this notice wherever their data/
// images are used -- kept on its own page (never inside a gameplay
// card, per the visual-quiz rule) and reachable from Profile.

export default function CreditsPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-8 pt-2 md:max-w-2xl">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/profile" aria-label="Back" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#3a362f]">
          <ArrowLeft size={20} strokeWidth={2} />
        </Link>
        <h1 className="text-[19px] font-bold tracking-tight text-[#3a362f]">Credits</h1>
      </div>

      <div className="rounded-2xl bg-[#f7f5f1] p-4">
        {/* Text-based wordmark placeholder -- I have no outbound network
            access in this environment to fetch TMDb's actual brand-asset
            logo file, so this is not their real logo. Replace this span
            with TMDb's official square/rectangle logo (available from
            their brand/attribution page) before relying on this for
            attribution compliance. */}
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0d253f] px-2.5 py-1.5">
          <span className="text-[13px] font-black italic tracking-tight text-[#01b4e4]">TMDB</span>
        </div>
        <p className="text-[13.5px] leading-relaxed text-[#3a362f]">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-[12.5px] font-medium text-[#2f6fa3] underline underline-offset-2"
        >
          themoviedb.org
        </a>
      </div>

      <p className="mt-4 text-[12px] text-[#a39d92]">
        Movie, TV, and cast imagery in Play is provided by The Movie Database (TMDb).
      </p>
    </div>
  );
}
