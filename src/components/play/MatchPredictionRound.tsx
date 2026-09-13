"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, ArrowLeft } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { submitPrediction, settleFixture } from "@/services/match-predictions-client";
import { getFixture } from "@/services/match-predictions-read-client";
import { usePoll } from "@/hooks/usePollForResult";
import { getErrorMessage, timeAgo } from "@/lib/utils";
import { RoundTagline } from "@/components/play/RoundTagline";
import { playGame } from "@/lib/play-config";
import type { FixtureRow } from "@/lib/game-types";

const PICK_LABEL: Record<string, string> = { home: "Home", draw: "Draw", away: "Away" };
const game = playGame("match-predictions");

/**
 * The real gameplay screen for one fixture -- lives at
 * /play/match-predictions/[fixtureId]. Image-first (team crests when
 * available), one fixture at a time: the crest pair + Home/Draw/Away
 * *is* the game, not a row in a list.
 *
 * usePollForResult expects a game_sessions row; match_fixtures is a
 * different table, so this polls match_fixtures directly instead --
 * same "plain DB read, no provider content" rule, just its own table.
 */
export function MatchPredictionRound({ fixture: initialFixture }: { fixture: FixtureRow }) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const [fixture, setFixture] = useState(initialFixture);
  const [submitting, setSubmitting] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");

  const mine = fixture.match_predictions.find((p) => p.user_id === userId);
  const theirs = otherMember ? fixture.match_predictions.find((p) => p.user_id === otherMember.id) : undefined;
  const result = fixture.result as { homeGoals: number; awayGoals: number } | null;
  const canSeeTheirs = !!mine || !!result;

  // Poll while there's still something to find out -- either I'm
  // waiting on the partner's pick, or the match hasn't been settled
  // yet. Plain match_fixtures reads only, no provider content.
  usePoll(!result, async () => {
    const fresh = await getFixture(fixture.id);
    if (fresh) setFixture(fresh as unknown as FixtureRow);
  });

  async function pick(winnerPick: "home" | "draw" | "away") {
    setSubmitting(true);
    try {
      await submitPrediction({ fixtureId: fixture.id, userId, winnerPick, spaceId: space.id, otherMemberId: otherMember?.id ?? null });
      const fresh = await getFixture(fixture.id);
      if (fresh) setFixture(fresh as unknown as FixtureRow);
    } catch (err) {
      show(getErrorMessage(err, "Couldn't save your prediction."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveResult() {
    if (homeGoals === "" || awayGoals === "") return;
    try {
      await settleFixture(fixture.id, Number(homeGoals), Number(awayGoals), space.id);
      setScoreOpen(false);
      const fresh = await getFixture(fixture.id);
      if (fresh) setFixture(fresh as unknown as FixtureRow);
    } catch (err) {
      show(getErrorMessage(err, "Couldn't save the result."), "error");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-6">
      <div className="mb-3 flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.push("/play")}
          aria-label="Back"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#3a362f] shadow-sm"
        >
          <ArrowLeft size={19} strokeWidth={2} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-[17px] font-bold tracking-tight text-[#3a362f]">{game.label}</p>
          <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5" style={{ backgroundColor: game.bg }}>
            <game.icon size={12} style={{ color: game.iconColor }} strokeWidth={2.25} />
            <span className="text-[11px] font-semibold" style={{ color: game.iconColor }}>
              Football
            </span>
          </div>
        </div>
      </div>

      <h1 className="mb-3 text-[19px] font-bold leading-tight text-[#3a362f]">
        {fixture.home_team} vs {fixture.away_team}
      </h1>

      <div className="flex items-center justify-center gap-6 py-4">
        <TeamCrest name={fixture.home_team} crestUrl={fixture.home_crest_url} />
        <span className="text-[13px] font-semibold text-[#a39d92]">vs</span>
        <TeamCrest name={fixture.away_team} crestUrl={fixture.away_crest_url} />
      </div>
      <p className="mb-4 text-center text-[12.5px] text-[#a39d92]">{timeAgo(fixture.kickoff_at)}</p>

      {result && (
        <div className="mb-3 rounded-2xl bg-[#e5eef6] px-4 py-3 text-center">
          <p className="text-[15px] font-bold text-[#2f6fa3]">
            Final: {result.homeGoals} - {result.awayGoals}
          </p>
        </div>
      )}

      {!mine ? (
        <div className="grid grid-cols-3 gap-2">
          {(["home", "draw", "away"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={submitting}
              onClick={() => pick(opt)}
              className="truncate rounded-2xl bg-[#f7f5f1] py-4 text-[14px] font-semibold text-[#3a362f] transition active:scale-[0.98] disabled:opacity-50"
            >
              {opt === "home" ? fixture.home_team : opt === "away" ? fixture.away_team : "Draw"}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-[#f7f5f1] px-4 py-6 text-center">
          <p className="text-[15px] font-semibold text-[#3a362f]">You picked {PICK_LABEL[mine.winner_pick]}</p>
          {canSeeTheirs && theirs && otherMember && (
            <p className="mt-1 text-[13px] text-[#7c766c]">
              {otherMember.display_name} picked {PICK_LABEL[theirs.winner_pick]}
            </p>
          )}
          {canSeeTheirs && !theirs && !result && (
            <p className="mt-1 text-[13px] text-[#a39d92]">Waiting on {otherMember?.display_name ?? "them"}</p>
          )}
        </div>
      )}

      {!result &&
        (scoreOpen ? (
          <div className="mt-3 flex items-center justify-center gap-2">
            <input
              type="number"
              value={homeGoals}
              onChange={(e) => setHomeGoals(e.target.value)}
              placeholder="0"
              className="w-16 rounded-xl bg-[#f7f5f1] px-2 py-2 text-center text-[14px] outline-none"
            />
            <span className="text-[#a39d92]">-</span>
            <input
              type="number"
              value={awayGoals}
              onChange={(e) => setAwayGoals(e.target.value)}
              placeholder="0"
              className="w-16 rounded-xl bg-[#f7f5f1] px-2 py-2 text-center text-[14px] outline-none"
            />
            <button type="button" onClick={saveResult} className="rounded-full bg-[#3a362f] px-4 py-2 text-[13px] font-semibold text-white">
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setScoreOpen(true)}
            className="mt-3 block w-full text-center text-[12.5px] font-medium text-[#a39d92] underline underline-offset-2"
          >
            Add final score
          </button>
        ))}

      {game.tagline && game.taglineIcon && <RoundTagline text={game.tagline} icon={game.taglineIcon} />}
    </div>
  );
}

function TeamCrest({ name, crestUrl }: { name: string; crestUrl: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-[#f2efe9]">
        {crestUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={crestUrl} alt="" loading="eager" fetchPriority="high" className="h-full w-full object-cover" />
        ) : (
          <Trophy size={22} className="text-[#a39d92]" />
        )}
      </div>
      <p className="max-w-[90px] truncate text-center text-[12.5px] font-bold text-[#3a362f]">{name}</p>
    </div>
  );
}
