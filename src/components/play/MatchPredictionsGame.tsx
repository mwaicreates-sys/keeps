"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Plus, X as XIcon } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createFixture, submitPrediction, settleFixture } from "@/services/match-predictions-client";
import { getErrorMessage, timeAgo } from "@/lib/utils";
import { GameHeader } from "@/components/play/GameHeader";
import { EmptyState } from "@/components/EmptyState";
import type { FixtureRow } from "@/lib/game-types";

const PICK_LABEL: Record<string, string> = { home: "Home", draw: "Draw", away: "Away" };

export function MatchPredictionsGame({ fixtures }: { fixtures: FixtureRow[] }) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [kickoffAt, setKickoffAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [creating, setCreating] = useState(false);

  async function submitFixture(e: React.FormEvent) {
    e.preventDefault();
    if (!homeTeam.trim() || !awayTeam.trim()) return;
    setCreating(true);
    try {
      await createFixture({
        spaceId: space.id,
        createdBy: userId,
        otherMemberId: otherMember?.id ?? null,
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        kickoffAt: new Date(kickoffAt).toISOString(),
      });
      setHomeTeam("");
      setAwayTeam("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't add that fixture."), "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <GameHeader title="Match Predictions" subtitle="Call the score before kickoff." />

      <div className="px-4 pb-4">
        {showForm ? (
          <form onSubmit={submitFixture} className="space-y-2.5 rounded-2xl bg-[#f7f5f1] p-3.5">
            <div className="grid grid-cols-2 gap-2.5">
              <input
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                placeholder="Home team"
                className="min-w-0 rounded-xl bg-white px-3.5 py-2.5 text-[14px] text-[#3a362f] outline-none placeholder:text-[#a39d92]"
              />
              <input
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                placeholder="Away team"
                className="min-w-0 rounded-xl bg-white px-3.5 py-2.5 text-[14px] text-[#3a362f] outline-none placeholder:text-[#a39d92]"
              />
            </div>
            <input
              type="datetime-local"
              value={kickoffAt}
              onChange={(e) => setKickoffAt(e.target.value)}
              className="w-full rounded-xl bg-white px-3.5 py-2.5 text-[14px] text-[#3a362f] outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Cancel"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#3a362f]"
              >
                <XIcon size={17} />
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-full bg-[#3a362f] py-3 text-[14.5px] font-semibold text-white disabled:opacity-50"
              >
                {creating ? "Adding…" : "Add fixture"}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#3a362f] py-4 text-[15.5px] font-semibold text-white transition active:scale-[0.98]"
          >
            <Plus size={18} /> New fixture
          </button>
        )}
      </div>

      <div className="px-4">
        {fixtures.length === 0 ? (
          <EmptyState icon={Trophy} title="No fixtures yet" body="Add one above and call the score before kickoff." />
        ) : (
          <ul className="space-y-2.5">
            {fixtures.map((f) => (
              <FixtureCard key={f.id} fixture={f} onChanged={() => router.refresh()} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FixtureCard({ fixture, onChanged }: { fixture: FixtureRow; onChanged: () => void }) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");

  const mine = fixture.match_predictions.find((p) => p.user_id === userId);
  const theirs = otherMember ? fixture.match_predictions.find((p) => p.user_id === otherMember.id) : undefined;
  const result = fixture.result as { homeGoals: number; awayGoals: number } | null;
  // Your partner's pick stays hidden until you've predicted too (or the
  // match is settled) -- same "no peeking" spirit as every other game.
  const canSeeTheirs = !!mine || !!result;

  async function pick(winnerPick: "home" | "draw" | "away") {
    setSubmitting(true);
    try {
      await submitPrediction({ fixtureId: fixture.id, userId, winnerPick, spaceId: space.id, otherMemberId: otherMember?.id ?? null });
      onChanged();
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
      onChanged();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't save the result."), "error");
    }
  }

  return (
    <li className="rounded-2xl bg-white p-3.5 shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[14.5px] font-semibold text-[#3a362f]">
          {fixture.home_team} vs {fixture.away_team}
        </p>
        <span className="shrink-0 text-[11px] text-[#a39d92]">{timeAgo(fixture.kickoff_at)}</span>
      </div>

      {result && <p className="mt-1 text-[13px] font-bold text-[#2f6fa3]">Final: {result.homeGoals} - {result.awayGoals}</p>}

      {!mine ? (
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {(["home", "draw", "away"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={submitting}
              onClick={() => pick(opt)}
              className="truncate rounded-xl bg-[#f7f5f1] py-2 text-[12.5px] font-semibold text-[#3a362f] disabled:opacity-50"
            >
              {opt === "home" ? fixture.home_team.slice(0, 8) : opt === "away" ? fixture.away_team.slice(0, 8) : "Draw"}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12.5px]">
          <span className="rounded-full bg-[#e5eef6] px-2.5 py-1 font-medium text-[#2f6fa3]">You: {PICK_LABEL[mine.winner_pick]}</span>
          {canSeeTheirs && theirs && otherMember && (
            <span className="rounded-full bg-[#f2efe9] px-2.5 py-1 font-medium text-[#7c766c]">
              {otherMember.display_name}: {PICK_LABEL[theirs.winner_pick]}
            </span>
          )}
          {canSeeTheirs && !theirs && (
            <span className="rounded-full bg-[#f2efe9] px-2.5 py-1 font-medium text-[#a39d92]">
              Waiting on {otherMember?.display_name ?? "them"}
            </span>
          )}
        </div>
      )}

      {!result &&
        (scoreOpen ? (
          <div className="mt-2.5 flex items-center gap-1.5">
            <input
              type="number"
              value={homeGoals}
              onChange={(e) => setHomeGoals(e.target.value)}
              placeholder="0"
              className="w-14 rounded-lg bg-[#f7f5f1] px-2 py-1.5 text-center text-[13px] outline-none"
            />
            <span className="text-[#a39d92]">-</span>
            <input
              type="number"
              value={awayGoals}
              onChange={(e) => setAwayGoals(e.target.value)}
              placeholder="0"
              className="w-14 rounded-lg bg-[#f7f5f1] px-2 py-1.5 text-center text-[13px] outline-none"
            />
            <button type="button" onClick={saveResult} className="rounded-full bg-[#3a362f] px-3 py-1.5 text-[12px] font-semibold text-white">
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setScoreOpen(true)}
            className="mt-2 text-[11.5px] font-medium text-[#a39d92] underline underline-offset-2"
          >
            Add final score
          </button>
        ))}
    </li>
  );
}
