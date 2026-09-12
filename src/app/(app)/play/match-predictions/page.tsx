"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { EmptyState } from "@/components/EmptyState";
import { BattleChoice } from "@/components/BattleChoice";
import { createFixture, submitPrediction, settleFixture } from "@/services/match-predictions-client";
import { listFixtures } from "@/services/match-predictions-read-client";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type Fixture = Awaited<ReturnType<typeof listFixtures>>[number];

export default function MatchPredictionsPage() {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({ home: "", away: "", kickoff: "" });

  const refresh = useCallback(async () => setFixtures(await listFixtures(space.id)), [space.id]);
  useEffect(() => { refresh(); }, [refresh]);

  async function create() {
    if (!form.home.trim() || !form.away.trim() || !form.kickoff) return;
    await createFixture({
      spaceId: space.id,
      createdBy: userId,
      otherMemberId: otherMember?.id ?? null,
      homeTeam: form.home.trim(),
      awayTeam: form.away.trim(),
      kickoffAt: new Date(form.kickoff).toISOString(),
    });
    setForm({ home: "", away: "", kickoff: "" });
    show("Fixture added. Manual results — no paid football API needed.");
    refresh();
  }

  const open = fixtures.find((f) => f.id === openId);

  if (open) return <PredictScreen fixture={open} onBack={() => { setOpenId(null); refresh(); }} />;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-1 font-display text-2xl">Match Predictions</h1>
      <p className="mb-5 text-sm text-ink-soft">Call the winner. No paid football API required — add fixtures yourselves.</p>

      <div className="mb-6 space-y-2 rounded-2xl border border-line p-3.5">
        <div className="flex gap-2">
          <input value={form.home} onChange={(e) => setForm({ ...form, home: e.target.value })} placeholder="Home team" className="w-1/2 rounded-xl border border-line px-3 py-2 text-sm" />
          <input value={form.away} onChange={(e) => setForm({ ...form, away: e.target.value })} placeholder="Away team" className="w-1/2 rounded-xl border border-line px-3 py-2 text-sm" />
        </div>
        <input type="datetime-local" value={form.kickoff} onChange={(e) => setForm({ ...form, kickoff: e.target.value })} className="w-full rounded-xl border border-line px-3 py-2 text-sm" />
        <button onClick={create} className="w-full rounded-full bg-ink py-2.5 text-sm font-medium text-paper">Add fixture</button>
      </div>

      {fixtures.length === 0 ? (
        <EmptyState icon={Trophy} title="No fixtures yet" />
      ) : (
        <ul className="space-y-2">
          {fixtures.map((f) => {
            const answered = (f.match_predictions as { user_id: string }[]).some((p) => p.user_id === userId);
            const settled = !!f.result;
            return (
              <li key={f.id}>
                <button onClick={() => setOpenId(f.id)} className="flex w-full items-center justify-between rounded-2xl border border-line px-4 py-3 text-left">
                  <span className="text-sm">{f.home_team} vs {f.away_team}</span>
                  <span className="text-xs text-ink-soft">{settled ? "Settled" : answered ? "Predicted" : "Predict"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PredictScreen({ fixture, onBack }: { fixture: Fixture; onBack: () => void }) {
  const { userId, space, otherMember, members } = useSession();
  const preds = fixture.match_predictions as { user_id: string; winner_pick: string; over_under: string | null; btts: string | null }[];
  const mine = preds.find((p) => p.user_id === userId);
  const [winner, setWinner] = useState<"A" | "B" | "DRAW" | null>(mine ? (mine.winner_pick === "home" ? "A" : mine.winner_pick === "away" ? "B" : "DRAW") : null);
  const [overUnder, setOverUnder] = useState<"over" | "under" | null>((mine?.over_under as "over" | "under") ?? null);
  const [btts, setBtts] = useState<"yes" | "no" | null>((mine?.btts as "yes" | "no") ?? null);
  const [goals, setGoals] = useState({ home: "", away: "" });
  const settled = !!fixture.result;
  const bothPredicted = preds.length >= 2;

  async function pickWinner(c: "A" | "B" | "DRAW") {
    setWinner(c);
    const winner_pick: "home" | "away" | "draw" = c === "A" ? "home" : c === "B" ? "away" : "draw";
    await submitPrediction({
      fixtureId: fixture.id,
      userId,
      winnerPick: winner_pick,
      overUnder: overUnder ?? undefined,
      btts: btts ?? undefined,
      spaceId: space.id,
      otherMemberId: otherMember?.id ?? null,
    });
  }

  async function pickMarket(kind: "over_under" | "btts", value: string) {
    if (kind === "over_under") setOverUnder(value as "over" | "under");
    else setBtts(value as "yes" | "no");
    if (!winner) return;
    const winner_pick = winner === "A" ? "home" : winner === "B" ? "away" : "draw";
    await submitPrediction({
      fixtureId: fixture.id,
      userId,
      winnerPick: winner_pick as "home" | "draw" | "away",
      overUnder: (kind === "over_under" ? value : overUnder) as "over" | "under" | undefined,
      btts: (kind === "btts" ? value : btts) as "yes" | "no" | undefined,
      spaceId: space.id,
      otherMemberId: otherMember?.id ?? null,
    });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 text-center">
      <button onClick={onBack} className="mb-4 text-left text-sm text-ink-soft">← Back</button>
      <p className="mb-1 text-xs uppercase tracking-wide text-ink-soft">
        {new Date(fixture.kickoff_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
      </p>

      <BattleChoice
        optionA={fixture.home_team}
        optionB={fixture.away_team}
        draw="DRAW"
        selected={winner}
        revealed={settled}
        onSelect={mine ? undefined : (c) => pickWinner(c)}
        onSelectDraw={mine ? undefined : () => pickWinner("DRAW")}
        badge="VS"
      />

      <div className="mt-8 space-y-3">
        <MarketRow label="Total goals" a="Over 2.5" b="Under 2.5" value={overUnder} onPick={(v) => pickMarket("over_under", v === "Over 2.5" ? "over" : "under")} disabled={!!mine} />
        <MarketRow label="Both teams to score" a="BTTS Yes" b="BTTS No" value={btts} onPick={(v) => pickMarket("btts", v === "BTTS Yes" ? "yes" : "no")} disabled={!!mine} />
      </div>

      {mine && !bothPredicted && <p className="mt-6 text-sm text-ink-soft">Prediction locked. Waiting for {otherMember?.display_name ?? "them"}…</p>}

      {bothPredicted && (
        <div className="mt-6 space-y-2 text-left">
          {members.map((m) => {
            const p = preds.find((pr) => pr.user_id === m.id);
            return (
              <p key={m.id} className="text-sm text-ink-soft">
                {m.id === userId ? "You" : m.display_name}: {p?.winner_pick.toUpperCase()}
                {p?.over_under && ` · ${p.over_under}`}
                {p?.btts && ` · BTTS ${p.btts}`}
              </p>
            );
          })}
        </div>
      )}

      {fixture.result != null && (
        <p className="mt-4 font-display text-xl">
          Final: {(fixture.result as { homeGoals: number; awayGoals: number }).homeGoals} - {(fixture.result as { homeGoals: number; awayGoals: number }).awayGoals}
        </p>
      )}

      {bothPredicted && !settled && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <input value={goals.home} onChange={(e) => setGoals({ ...goals, home: e.target.value })} className="w-14 rounded-lg border border-line py-1.5 text-center text-sm" placeholder="0" />
          <span className="text-ink-soft">-</span>
          <input value={goals.away} onChange={(e) => setGoals({ ...goals, away: e.target.value })} className="w-14 rounded-lg border border-line py-1.5 text-center text-sm" placeholder="0" />
          <button
            onClick={() => settleFixture(fixture.id, Number(goals.home) || 0, Number(goals.away) || 0, space.id).then(onBack)}
            className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper"
          >
            Settle result
          </button>
        </div>
      )}
    </div>
  );
}

function MarketRow({ label, a, b, value, onPick, disabled }: { label: string; a: string; b: string; value: string | null; onPick: (v: string) => void; disabled: boolean }) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-ink-soft">{label}</p>
      <div className="flex justify-center gap-2">
        {[a, b].map((opt) => {
          const isSelected = (opt === a && value === "over") || (opt === a && value === "yes") || (opt === b && value === "under") || (opt === b && value === "no");
          return (
            <button
              key={opt}
              disabled={disabled}
              onClick={() => onPick(opt)}
              className={cn("rounded-full border px-4 py-1.5 text-xs font-medium transition disabled:opacity-60", isSelected ? "border-accent bg-accent-soft text-accent" : "border-line")}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
