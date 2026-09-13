import Link from "next/link";
import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";
import { HomeHeader } from "@/components/home/HomeHeader";
import { Heart, ListOrdered, EyeOff, Trophy, HelpCircle, SplitSquareVertical, ChevronRight } from "lucide-react";

// Inline only — deliberately not importing PlayGameCard, PlayPreviews, or
// PageIntro. This hub is built directly against Drop's own page structure
// (src/app/(app)/drop/page.tsx + DropTypeCard) as the physical-scale
// reference, so nothing here can inherit sizing from the old Play code.

const GAMES = [
  {
    href: "/play/this-or-that",
    bg: "#fbe9ec",
    iconBg: "#f7d3d9",
    iconColor: "#c2495f",
    icon: Heart,
    title: "This or That",
    subtitle: "Pick a side. See if you match.",
  },
  {
    href: "/play/top5",
    bg: "#eaeafb",
    iconBg: "#d9d9f5",
    iconColor: "#5457c7",
    icon: ListOrdered,
    title: "My Top 5",
    subtitle: "Rank five. Compare yours.",
  },
  {
    href: "/play/blind-rank",
    bg: "#e6f2e9",
    iconBg: "#cde7d4",
    iconColor: "#2f8f52",
    icon: EyeOff,
    title: "Blind Rank",
    subtitle: "Rank them before seeing what comes next.",
  },
  {
    href: "/play/match-predictions",
    bg: "#faf1e2",
    iconBg: "#f2e0bd",
    iconColor: "#a3742b",
    icon: Trophy,
    title: "Match Predictions",
    subtitle: "Call the result before kickoff.",
  },
  {
    href: "/play/guess-mine",
    bg: "#e5eef6",
    iconBg: "#cfe1f2",
    iconColor: "#2f6fa3",
    icon: HelpCircle,
    title: "Guess Mine",
    subtitle: "Guess what the other person picked.",
  },
  {
    href: "/play/keep3-drop2",
    bg: "#fdecec",
    iconBg: "#f8d6d6",
    iconColor: "#c23a3a",
    icon: SplitSquareVertical,
    title: "Keep 3, Drop 2",
    subtitle: "Five choices. Only three survive.",
  },
] as const;

export default async function PlayHubPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const [{ count: unreadCount }, { data: fixture }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).is("read_at", null),
    supabase
      .from("match_fixtures")
      .select("home_team")
      .eq("space_id", ctx.space.id)
      .order("kickoff_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader unreadCount={unreadCount ?? 0} />

      {/* Same title block markup/scale as PageIntro (32px/16px), inlined
          per instruction rather than imported, so Games can't share any
          component-level sizing bug with the rest of the app. */}
      <div className="px-4 pb-4 pt-1">
        <h1 className="text-[32px] font-bold leading-[1.1] tracking-tight text-[#3a362f]">Games</h1>
        <p className="mt-1 text-[16px] leading-[1.45] text-[#a39d92]">Little games for the two of you.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4">
        {GAMES.map(({ href, bg, iconBg, iconColor, icon: Icon, title, subtitle }) => (
          <Link
            key={href}
            href={href}
            className="relative flex h-[164px] flex-col justify-between overflow-hidden rounded-[26px] px-5 py-4 text-left transition active:scale-[0.98]"
            style={{ backgroundColor: bg }}
          >
            <div className="flex items-start justify-between">
              <span className="grid h-[52px] w-[52px] place-items-center rounded-2xl" style={{ backgroundColor: iconBg, color: iconColor }}>
                <Icon size={32} strokeWidth={2} />
              </span>
              <span className="-m-2.5 grid h-11 w-11 place-items-center">
                <ChevronRight size={23} className="text-[#00000060]" />
              </span>
            </div>

            <GamePreview slug={href} homeTeam={fixture?.home_team ?? undefined} />

            <div className="max-w-[68%]">
              <p className="text-[19px] font-bold leading-tight text-[#2c281f]">{title}</p>
              <p className="mt-1 text-[15px] leading-[1.35] text-[#5c574c]">{subtitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * Deliberately plain divs, no icon/illustration system — a tiny visual hint
 * per game, positioned the same way Drop positions its preview (absolute,
 * bottom-right of the card), never influencing the card's own size.
 */
function GamePreview({ slug, homeTeam }: { slug: string; homeTeam?: string }) {
  if (slug === "/play/this-or-that") {
    return (
      <div className="absolute bottom-4 right-4 flex items-center gap-1">
        <div className="h-8 w-7 -rotate-6 rounded-md bg-white/80 shadow-sm" />
        <span className="grid h-4 w-4 place-items-center rounded-full bg-[#3a362f] text-[7px] font-bold text-white">OR</span>
        <div className="h-8 w-7 rotate-6 rounded-md bg-white/80 shadow-sm" />
      </div>
    );
  }

  if (slug === "/play/top5") {
    return (
      <div className="absolute bottom-4 right-4 w-16 space-y-1 rounded-lg bg-white/80 p-2 shadow-sm">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-1">
            <span className="text-[8px] font-bold text-[#5457c7]">{n}</span>
            <span className="h-[2px] flex-1 rounded-full bg-[#5457c7]/25" />
          </div>
        ))}
      </div>
    );
  }

  if (slug === "/play/blind-rank") {
    return (
      <div className="absolute bottom-4 right-4">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/80 shadow-sm">
          <span className="text-sm font-bold text-[#2f8f52]">?</span>
        </div>
      </div>
    );
  }

  if (slug === "/play/match-predictions") {
    return (
      <div className="absolute bottom-4 right-4 left-5 flex min-w-0 gap-1">
        <span className="min-w-0 flex-1 truncate rounded-md bg-white/80 px-1 py-1 text-center text-[8px] font-medium text-[#5c574c] shadow-sm">
          {homeTeam ? homeTeam.slice(0, 5) : "Home"}
        </span>
        <span className="min-w-0 flex-1 truncate rounded-md bg-white/80 px-1 py-1 text-center text-[8px] font-medium text-[#5c574c] shadow-sm">
          Draw
        </span>
        <span className="min-w-0 flex-1 truncate rounded-md bg-white/80 px-1 py-1 text-center text-[8px] font-medium text-[#5c574c] shadow-sm">
          Away
        </span>
      </div>
    );
  }

  if (slug === "/play/guess-mine") {
    return (
      <div className="absolute bottom-4 right-4 flex items-center gap-1">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/80 shadow-sm">
          <span className="text-xs font-bold text-[#2f6fa3]">?</span>
        </div>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/60 shadow-sm">
          <span className="text-xs font-bold text-[#2f6fa3]">?</span>
        </div>
      </div>
    );
  }

  // /play/keep3-drop2
  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-6 w-4 rounded-sm bg-white/80 shadow-sm" style={{ opacity: i < 3 ? 1 : 0.4 }} />
      ))}
    </div>
  );
}
