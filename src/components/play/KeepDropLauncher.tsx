"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { createGameSession } from "@/services/games-client";
import { pickKeepDropPrompt } from "@/lib/keep-drop-prompt";
import { playGame } from "@/lib/play-config";
import { GameLauncher } from "@/components/play/GameLauncher";

const game = playGame("keep3-drop2");

/** Base route for Keep 3, Drop 2 -- reached only when there's no
 * resumable session. Starts a fresh round with the same
 * pickKeepDropPrompt + createGameSession the round screen's own
 * "Next round" uses. */
export function KeepDropLauncher() {
  const { userId, space, otherMember } = useSession();
  const router = useRouter();

  async function start() {
    const { prompt, topic } = await pickKeepDropPrompt(space.id);
    const session = await createGameSession({
      spaceId: space.id,
      createdBy: userId,
      otherMemberId: otherMember?.id ?? null,
      gameType: "keep3_drop2",
      topic,
      category: prompt.category,
      prompt,
    });
    router.replace(`/play/keep3-drop2/${session.id}`);
  }

  return <GameLauncher label={game.label} icon={game.icon} bg={game.bg} iconColor={game.iconColor} start={start} />;
}
