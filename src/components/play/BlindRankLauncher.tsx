"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { createGameSession } from "@/services/games-client";
import { pickBlindRankPrompt } from "@/lib/blind-rank-prompt";
import { playGame } from "@/lib/play-config";
import { GameLauncher } from "@/components/play/GameLauncher";

const game = playGame("blind-rank");

/** Base route for Blind Rank -- reached only when there's no resumable
 * session. Starts a fresh round with the same pickBlindRankPrompt +
 * createGameSession the round screen's own "Next round" uses. */
export function BlindRankLauncher() {
  const { userId, space, otherMember } = useSession();
  const router = useRouter();

  async function start() {
    const { prompt, topic } = await pickBlindRankPrompt(space.id);
    const session = await createGameSession({
      spaceId: space.id,
      createdBy: userId,
      otherMemberId: otherMember?.id ?? null,
      gameType: "blind_rank",
      topic,
      category: prompt.category,
      prompt,
    });
    router.replace(`/play/blind-rank/${session.id}`);
  }

  return <GameLauncher label={game.label} icon={game.icon} bg={game.bg} iconColor={game.iconColor} start={start} />;
}
