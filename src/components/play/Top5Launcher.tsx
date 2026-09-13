"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { createGameSession } from "@/services/games-client";
import { pickTop5Prompt } from "@/lib/top5-prompt";
import { playGame } from "@/lib/play-config";
import { GameLauncher } from "@/components/play/GameLauncher";

const game = playGame("top5");

/** Base route for Top 5 -- reached only when there's no resumable
 * session. Starts a fresh round with the same pickTop5Prompt +
 * createGameSession the round screen's own "Next round" uses. */
export function Top5Launcher() {
  const { userId, space, otherMember } = useSession();
  const router = useRouter();

  async function start() {
    const prompt = await pickTop5Prompt();
    const session = await createGameSession({
      spaceId: space.id,
      createdBy: userId,
      otherMemberId: otherMember?.id ?? null,
      gameType: "top5",
      topic: prompt.topic,
      category: prompt.category,
      prompt,
    });
    router.replace(`/play/top5/${session.id}`);
  }

  return <GameLauncher label={game.label} icon={game.icon} bg={game.bg} iconColor={game.iconColor} start={start} />;
}
