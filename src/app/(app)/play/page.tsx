import Link from "next/link";
import { SlidersHorizontal, History as HistoryIcon } from "lucide-react";
import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";
import { getTasteProfileServer } from "@/services/taste-profile-server";
import { PlayGameCard } from "@/components/play/PlayGameCard";
import { TuneNudgeBanner } from "@/components/play/TuneNudgeBanner";
import { PlayHomePrefetch } from "@/components/play/PlayHomePrefetch";
import {
  ThisOrThatPreview,
  Top5Preview,
  BlindRankPreview,
  MatchPredictionPreview,
  GuessMinePreview,
  KeepDropPreview,
} from "@/components/play/PlayPreviews";
import { PLAY_GAMES } from "@/lib/play-config";

// Own light-theme header (no back arrow -- Play is a primary destination,
// same as Home/Memories) -- see theme-routes.ts.

export default async function PlayPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const supabase = await createClient();

  const { data: recentFixture } = await supabase
    .from("match_fixtures")
    .select("home_team")
    .eq("space_id", ctx.space.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { artists: tasteArtists } = await getTasteProfileServer(ctx.space.id, ctx.userId);

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <PlayHomePrefetch />
      <div className="flex items-start justify-between px-4 pb-4 pt-2">
        <div>
          <h1 className="text-[32px] font-bold leading-[1.1] tracking-tight text-[#3a362f]">Play</h1>
          <p className="mt-1 text-[13px] text-[#a39d92]">Little games for the two of you.</p>
        </div>
        {/* Both deliberately subtle -- secondary entries, not gameplay
            CTAs. Game cards below are the only "start playing" tap
            target now; History is where old session lists live. */}
        <div className="mt-1 flex shrink-0 gap-1">
          <Link
            href="/play/history"
            aria-label="Play History"
            className="grid h-9 w-9 place-items-center rounded-full text-[#a39d92]"
          >
            <HistoryIcon size={18} />
          </Link>
          <Link
            href="/play/tune?edit=1"
            aria-label="Tune your Play"
            className="grid h-9 w-9 place-items-center rounded-full text-[#a39d92]"
          >
            <SlidersHorizontal size={18} />
          </Link>
        </div>
      </div>

      <TuneNudgeBanner hasProfile={tasteArtists.length > 0} />

      <div className="grid grid-cols-2 gap-3 px-4">
        {PLAY_GAMES.map((game) => (
          <PlayGameCard
            key={game.type}
            href={`/play/${game.slug}`}
            bg={game.bg}
            iconBg={game.iconBg}
            iconColor={game.iconColor}
            icon={game.icon}
            title={game.label}
            subtitle={game.subtitle}
            preview={
              game.type === "this_or_that" ? (
                <ThisOrThatPreview />
              ) : game.type === "top5" ? (
                <Top5Preview />
              ) : game.type === "blind_rank" ? (
                <BlindRankPreview />
              ) : game.type === "match_predictions" ? (
                <MatchPredictionPreview homeTeam={recentFixture?.home_team ?? undefined} />
              ) : game.type === "guess_mine" ? (
                <GuessMinePreview />
              ) : (
                <KeepDropPreview />
              )
            }
          />
        ))}
      </div>
    </div>
  );
}
