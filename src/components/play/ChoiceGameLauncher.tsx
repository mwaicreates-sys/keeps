"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { createGameSession } from "@/services/games-client";
import { pickChoicePrompt } from "@/lib/choice-prompt";
import { playGame } from "@/lib/play-config";
import { GameLauncher } from "@/components/play/GameLauncher";

/** Base route for This or That / Guess Mine, reached only when there's
 * no resumable session (the server page already redirected to one if
 * there was) -- starts a fresh round and redirects straight into it.
 * Reuses the exact same pickChoicePrompt + createGameSession the round
 * screen's own "Next round" button uses, so there's no second copy of
 * round-generation logic. */
export function ChoiceGameLauncher({ gameType, slug }: { gameType: "this_or_that" | "guess_mine"; slug: string }) {
  const { userId, space, otherMember } = useSession();
  const router = useRouter();
  const game = playGame(slug);

  async function start() {
    const prompt = await pickChoicePrompt(gameType, space.id);
    const session = await createGameSession({
      spaceId: space.id,
      createdBy: userId,
      otherMemberId: otherMember?.id ?? null,
      gameType,
      topic: prompt.topic,
      category: prompt.category,
      prompt,
    });
    router.replace(`/play/${slug}/${session.id}`);
  }

  return <GameLauncher label={game.label} icon={game.icon} bg={game.bg} iconColor={game.iconColor} start={start} />;
}
