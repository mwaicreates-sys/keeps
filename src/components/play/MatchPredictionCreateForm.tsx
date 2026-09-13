"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createFixture } from "@/services/match-predictions-client";
import { getErrorMessage } from "@/lib/utils";
import { playGame } from "@/lib/play-config";

const game = playGame("match-predictions");

/**
 * The one unavoidable exception to "tap the card, play immediately":
 * Match Predictions has no auto-generatable content (no sports
 * provider is wired up, and none should be per this pass's scope) --
 * fixtures are real matches the players themselves enter. Shown only
 * when the space has no fixture to resume or predict; kept to a single
 * small inline form, not a list of past fixtures.
 */
export function MatchPredictionCreateForm() {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [kickoffAt, setKickoffAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [creating, setCreating] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!homeTeam.trim() || !awayTeam.trim()) return;
    setCreating(true);
    try {
      const fixture = await createFixture({
        spaceId: space.id,
        createdBy: userId,
        otherMemberId: otherMember?.id ?? null,
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        kickoffAt: new Date(kickoffAt).toISOString(),
      });
      router.replace(`/play/match-predictions/${fixture.id}`);
    } catch (err) {
      show(getErrorMessage(err, "Couldn't add that fixture."), "error");
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-full" style={{ backgroundColor: game.bg, color: game.iconColor }}>
        <Trophy size={26} />
      </div>
      <h1 className="text-[20px] font-bold text-[#3a362f]">No match to predict yet</h1>
      <p className="mt-1 max-w-[280px] text-[13.5px] text-[#a39d92]">Add the next one you and your partner want to call.</p>
      <form onSubmit={submit} className="mt-6 w-full space-y-2.5 rounded-2xl bg-[#f7f5f1] p-3.5 text-left">
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
        <button
          type="submit"
          disabled={creating}
          className="w-full rounded-full bg-[#3a362f] py-3 text-[14.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {creating ? "Adding…" : "Add fixture"}
        </button>
      </form>
    </div>
  );
}
