"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, HelpCircle } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createGameSession, submitGameAnswer, updateGameSessionPrompt } from "@/services/games-client";
import { getGameSession } from "@/services/games-read-client";
import { warmAllKeepDropKinds, pickKeepDropPrompt, swapKeepDropItem, KEEP_COUNT, type KeepDropPrompt } from "@/lib/keep-drop-prompt";
import { recordPlaySignal, recordPlaySignalForItems } from "@/services/play-signals-client";
import { playGame } from "@/lib/play-config";
import { RoundHeader } from "@/components/play/RoundHeader";
import { RoundTagline } from "@/components/play/RoundTagline";
import { getErrorMessage } from "@/lib/utils";
import type { GameSessionRow } from "@/lib/game-types";
import type { Json } from "@/lib/types";

type Result = { overlap: string[]; overlapCount: number; [userId: string]: unknown };

const game = playGame("keep3-drop2");

/** The real gameplay screen for one Keep 3, Drop 2 round -- lives at
 * /play/keep3-drop2/[sessionId], distinct from the history list at
 * /play/keep3-drop2. */
export function KeepDropRound({ session: initialSession, roundNumber }: { session: GameSessionRow; roundNumber: number }) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [kept, setKept] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [startingNext, setStartingNext] = useState(false);
  const [swappingItem, setSwappingItem] = useState<string | null>(null);

  const prompt = session.prompt as unknown as KeepDropPrompt;
  const answeredByMe = session.game_answers.some((a) => a.user_id === userId);
  const result = session.game_results?.result as Result | undefined;
  const isVisual = !!prompt.images;
  const question = isVisual ? "Pick 3 to keep" : session.topic;

  useEffect(() => {
    warmAllKeepDropKinds(space.id);
  }, [space.id]);

  function toggle(item: string) {
    setKept((prev) => {
      if (prev.includes(item)) return prev.filter((i) => i !== item);
      if (prev.length >= KEEP_COUNT) return prev;
      return [...prev, item];
    });
  }

  async function submit() {
    if (kept.length !== KEEP_COUNT) return;
    setSubmitting(true);
    try {
      await submitGameAnswer({
        sessionId: session.id,
        userId,
        answer: { kept },
        spaceId: space.id,
        otherMemberId: otherMember?.id ?? null,
        gameType: "keep3_drop2",
        topic: session.topic,
      });
      if (prompt.ids) {
        const withId = (title: string) => prompt.ids?.[title];
        // Finishing the round proves familiarity with everything shown,
        // not just what got kept -- see familiarity.ts: selection is
        // engagement evidence, not the whole signal.
        recordPlaySignalForItems(
          prompt.items.filter(withId).map((i) => ({ id: withId(i)!, type: prompt.kind ?? "album", source: "musicbrainz" })),
          space.id,
          "seen"
        );
        recordPlaySignalForItems(
          kept.filter(withId).map((i) => ({ id: withId(i)!, type: prompt.kind ?? "album", source: "musicbrainz" })),
          space.id,
          "kept"
        );
      }
      const fresh = await getGameSession(session.id);
      setSession(fresh as unknown as GameSessionRow);
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't submit your picks."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  /** "Don't know this?" -- swaps one card, records a negative
   * familiarity signal against it, and persists the updated prompt so a
   * partner sees the same swap. */
  async function swapItem(item: string) {
    const ids = prompt.ids;
    const itemId = ids?.[item];
    if (!ids || !itemId || !prompt.kind) return; // hardcoded-pack fallback item -- nothing to swap in
    setSwappingItem(item);
    try {
      recordPlaySignal({ spaceId: space.id, itemId, itemType: prompt.kind, source: "musicbrainz", signalType: "unknown" });
      const replacement = await swapKeepDropItem(space.id, prompt.kind, Object.values(ids));
      if (!replacement) {
        show("Couldn't find a replacement right now.", "error");
        return;
      }
      const items = prompt.items.map((i) => (i === item ? replacement.title : i));
      const images = { ...prompt.images };
      delete images[item];
      images[replacement.title] = replacement.imageUrl;
      const nextIds = { ...ids };
      delete nextIds[item];
      nextIds[replacement.title] = replacement.id;
      const nextPrompt: KeepDropPrompt = { ...prompt, items, images, ids: nextIds };
      await updateGameSessionPrompt({ sessionId: session.id, prompt: nextPrompt as unknown as Record<string, unknown> });
      setSession((prev) => ({ ...prev, prompt: nextPrompt as unknown as Json }));
      setKept((prev) => prev.filter((i) => i !== item));
    } catch (err) {
      show(getErrorMessage(err, "Couldn't swap this item."), "error");
    } finally {
      setSwappingItem(null);
    }
  }

  async function nextRound() {
    setStartingNext(true);
    try {
      const { prompt: next, topic } = await pickKeepDropPrompt(space.id);
      const created = await createGameSession({
        spaceId: space.id,
        createdBy: userId,
        otherMemberId: otherMember?.id ?? null,
        gameType: "keep3_drop2",
        topic,
        category: next.category,
        prompt: next,
      });
      router.push(`/play/keep3-drop2/${created.id}`);
    } catch (err) {
      show(getErrorMessage(err, "Couldn't start the next round."), "error");
      setStartingNext(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-6">
      <RoundHeader
        slug="keep3-drop2"
        title={game.label}
        category={prompt.category}
        icon={game.icon}
        pillBg={game.bg}
        pillColor={game.iconColor}
        roundNumber={roundNumber}
        question={question}
      />

      {result ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-[#fdecec] px-4 py-3 text-center">
            <p className="text-[15px] font-semibold text-[#c23a3a]">
              {result.overlapCount} kept in common
              {result.overlap.length > 0 && `: ${result.overlap.join(", ")}`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <KeptList label="You" kept={result[userId] as string[]} all={prompt.items} images={prompt.images} />
            {otherMember && (
              <KeptList label={otherMember.display_name} kept={result[otherMember.id] as string[]} all={prompt.items} images={prompt.images} />
            )}
          </div>
          <button
            type="button"
            onClick={nextRound}
            disabled={startingNext}
            className="w-full rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {startingNext ? "Starting…" : "Next round"}
          </button>
        </div>
      ) : answeredByMe ? (
        <div className="rounded-2xl bg-[#f7f5f1] px-4 py-8 text-center">
          <p className="text-[15px] font-semibold text-[#3a362f]">Picks locked in</p>
          <p className="mt-1 text-[13px] text-[#a39d92]">
            Waiting on {otherMember?.display_name ?? "your partner"} to choose too.
          </p>
        </div>
      ) : isVisual ? (
        <div>
          <div className="grid grid-cols-2 gap-3">
            {prompt.items.map((item, i) => {
              const isKept = kept.includes(item);
              const image = prompt.images?.[item];
              const canSwap = !!prompt.ids?.[item];
              return (
                <div
                  key={item}
                  className={`relative text-center ${
                    i === prompt.items.length - 1 && prompt.items.length % 2 === 1 ? "col-span-2 mx-auto w-1/2 min-w-[45%]" : ""
                  }`}
                >
                  <button type="button" onClick={() => toggle(item)} className="block w-full transition">
                    <div className={`relative aspect-square w-full overflow-hidden rounded-[18px] bg-[#f2efe9] ${isKept ? "ring-[3px] ring-[#3a362f]" : ""}`}>
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt="" className={`h-full w-full object-cover transition ${!isKept && kept.length >= KEEP_COUNT ? "opacity-50" : ""}`} />
                      ) : (
                        <div className="h-full w-full bg-black/10" />
                      )}
                      <span
                        className={`absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-white ${
                          isKept ? "bg-[#c23a3a]" : "bg-white/25"
                        }`}
                      >
                        {isKept && <Check size={13} className="text-white" />}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-[13px] font-bold text-[#3a362f]">{item}</p>
                  </button>
                  {canSwap && (
                    <button
                      type="button"
                      onClick={() => swapItem(item)}
                      disabled={swappingItem !== null}
                      aria-label={`Don't know ${item}? Swap it`}
                      className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-white/25 text-white disabled:opacity-50"
                    >
                      <HelpCircle size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={kept.length !== KEEP_COUNT || submitting}
            className="mt-3.5 w-full rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Submitting…" : `Confirm ${KEEP_COUNT} picks`}
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-[12.5px] text-[#a39d92]">Keep exactly {KEEP_COUNT} — the rest get dropped.</p>
          <div className="space-y-2">
            {prompt.items.map((item) => {
              const isKept = kept.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggle(item)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-[14.5px] font-medium transition ${
                    isKept ? "bg-[#3a362f] text-white" : "bg-[#f7f5f1] text-[#3a362f]"
                  }`}
                >
                  {item}
                  {isKept && <Check size={17} />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={kept.length !== KEEP_COUNT || submitting}
            className="mt-3 w-full rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Submitting…" : `Confirm ${KEEP_COUNT} picks`}
          </button>
        </div>
      )}

      {game.tagline && game.taglineIcon && <RoundTagline text={game.tagline} icon={game.taglineIcon} />}
    </div>
  );
}

function KeptList({ label, kept, all, images }: { label: string; kept: string[]; all: string[]; images?: Record<string, string | null> }) {
  return (
    <div className="rounded-2xl bg-[#f7f5f1] p-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#a39d92]">{label}</p>
      <ul className="space-y-1.5">
        {all.map((item) => {
          const image = images?.[item];
          const isKept = kept.includes(item);
          return (
            <li key={item} className="flex items-center gap-2">
              {image !== undefined &&
                (image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" className={`h-7 w-7 shrink-0 rounded-md object-cover ${isKept ? "" : "opacity-40 grayscale"}`} />
                ) : (
                  <div className="h-7 w-7 shrink-0 rounded-md bg-black/10" />
                ))}
              <span className={`truncate text-[12.5px] ${isKept ? "font-semibold text-[#3a362f]" : "text-[#c7c1b6] line-through"}`}>{item}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
