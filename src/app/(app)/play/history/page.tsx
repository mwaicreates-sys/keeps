import Link from "next/link";
import { ArrowLeft, History as HistoryIcon } from "lucide-react";
import { getSessionContext } from "@/services/session";
import { getGameSessions, getMatchFixtures } from "@/services/games-server";
import { sessionStatus, fixtureStatus } from "@/lib/game-types";
import { PLAY_GAMES, playGame } from "@/lib/play-config";
import { EmptyState } from "@/components/EmptyState";
import { timeAgo } from "@/lib/utils";
import type { GameType } from "@/services/games-client";

// Secondary route: past rounds/fixtures across every game, one flat
// list, each row deep-linking straight to that specific round/fixture.
// Reached only via the small history icon on the Play hub -- never the
// base game routes anymore (those launch gameplay immediately).

const SESSION_GAME_TYPES: GameType[] = ["this_or_that", "guess_mine", "blind_rank", "keep3_drop2", "top5"];

type HistoryItem = {
  id: string;
  href: string;
  gameLabel: string;
  bg: string;
  iconColor: string;
  icon: (typeof PLAY_GAMES)[number]["icon"];
  topic: string;
  createdAt: string;
  status: "completed" | "waiting" | "your_turn";
};

export default async function PlayHistoryPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const [sessionsByType, fixtures] = await Promise.all([
    Promise.all(SESSION_GAME_TYPES.map((gt) => getGameSessions(ctx.space.id, gt))),
    getMatchFixtures(ctx.space.id),
  ]);

  const items: HistoryItem[] = [];
  SESSION_GAME_TYPES.forEach((gt, i) => {
    const game = PLAY_GAMES.find((g) => g.type === gt)!;
    for (const s of sessionsByType[i]) {
      items.push({
        id: s.id,
        href: `/play/${game.slug}/${s.id}`,
        gameLabel: game.label,
        bg: game.bg,
        iconColor: game.iconColor,
        icon: game.icon,
        topic: s.topic,
        createdAt: s.created_at,
        status: sessionStatus(s, ctx.userId),
      });
    }
  });
  const matchGame = playGame("match-predictions");
  for (const f of fixtures) {
    items.push({
      id: f.id,
      href: `/play/match-predictions/${f.id}`,
      gameLabel: matchGame.label,
      bg: matchGame.bg,
      iconColor: matchGame.iconColor,
      icon: matchGame.icon,
      topic: `${f.home_team} vs ${f.away_team}`,
      createdAt: f.created_at,
      status: fixtureStatus(f, ctx.userId),
    });
  }
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <div className="flex items-center gap-2 px-3 pb-2 pt-2">
        <Link href="/play" aria-label="Back" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#3a362f]">
          <ArrowLeft size={20} strokeWidth={2} />
        </Link>
        <h1 className="text-[19px] font-bold tracking-tight text-[#3a362f]">Play History</h1>
      </div>
      <p className="px-4 pb-3 text-[13px] text-[#a39d92]">Past rounds and fixtures across every game.</p>

      <div className="px-4">
        {items.length === 0 ? (
          <EmptyState icon={HistoryIcon} title="Nothing yet" body="Play a round from the Play hub and it'll show up here." />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={`${item.href}`}>
                <Link
                  href={item.href}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: item.bg, color: item.iconColor }}>
                    <item.icon size={16} strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-[#3a362f]">{item.topic}</p>
                    <p className="text-[11px] text-[#a39d92]">
                      {item.gameLabel} · {timeAgo(item.createdAt)}
                    </p>
                  </div>
                  <StatusChip status={item.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: "completed" | "waiting" | "your_turn" }) {
  if (status === "completed") {
    return <span className="shrink-0 rounded-full bg-[#e6f2e9] px-2.5 py-1 text-[11px] font-semibold text-[#2f8f52]">Done</span>;
  }
  if (status === "waiting") {
    return <span className="shrink-0 rounded-full bg-[#f2efe9] px-2.5 py-1 text-[11px] font-medium text-[#a39d92]">Waiting</span>;
  }
  return <span className="shrink-0 rounded-full bg-[#faf1e2] px-2.5 py-1 text-[11px] font-semibold text-[#a3742b]">Your turn</span>;
}
