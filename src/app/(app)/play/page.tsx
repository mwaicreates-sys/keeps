import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";
import { HomeHeader } from "@/components/home/HomeHeader";
import { PlayGameCard } from "@/components/play/PlayGameCard";
import {
  ThisOrThatPreview,
  Top5Preview,
  BlindRankPreview,
  MatchPredictionPreview,
  GuessMinePreview,
  KeepDropPreview,
} from "@/components/play/PlayPreviews";
import { Swords, ListOrdered, EyeOff, Trophy, HelpCircle, SplitSquareVertical } from "lucide-react";

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

      <div className="px-4 pb-4 pt-1">
        <h1 className="text-[32px] font-extrabold tracking-tight text-[#3a362f]">Play</h1>
        <p className="mt-0.5 text-[16px] leading-[1.4] text-[#a39d92]">
          Little games that say more than a chat ever could.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4">
        <PlayGameCard
          href="/play/this-or-that"
          bg="#fbe9ec"
          iconBg="#f7d3d9"
          iconColor="#c2495f"
          icon={Swords}
          title="This or That"
          subtitle="Pick a side. See if you match."
          preview={<ThisOrThatPreview />}
        />
        <PlayGameCard
          href="/play/top5"
          bg="#eaeafb"
          iconBg="#d9d9f5"
          iconColor="#5457c7"
          icon={ListOrdered}
          title="My Top 5"
          subtitle="Rank it. Compare it."
          preview={<Top5Preview />}
        />
        <PlayGameCard
          href="/play/blind-rank"
          bg="#e6f2e9"
          iconBg="#cde7d4"
          iconColor="#2f8f52"
          icon={EyeOff}
          title="Blind Rank"
          subtitle="One at a time, no take-backs."
          preview={<BlindRankPreview />}
        />
        <PlayGameCard
          href="/play/match-predictions"
          bg="#faf1e2"
          iconBg="#f2e0bd"
          iconColor="#a3742b"
          icon={Trophy}
          title="Match Predictions"
          subtitle="Call the result before kickoff."
          preview={<MatchPredictionPreview homeTeam={fixture?.home_team ?? undefined} />}
        />
        <PlayGameCard
          href="/play/guess-mine"
          bg="#e5eef6"
          iconBg="#cfe1f2"
          iconColor="#2f6fa3"
          icon={HelpCircle}
          title="Guess Mine"
          subtitle="How well do you know them?"
          preview={<GuessMinePreview />}
        />
        <PlayGameCard
          href="/play/keep3-drop2"
          bg="#fdecec"
          iconBg="#f8d6d6"
          iconColor="#c23a3a"
          icon={SplitSquareVertical}
          title="Keep 3, Drop 2"
          subtitle="Hard choices only."
          preview={<KeepDropPreview />}
        />
      </div>
    </div>
  );
}
