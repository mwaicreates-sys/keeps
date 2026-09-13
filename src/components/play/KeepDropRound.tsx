"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X as XIcon, Check } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createGameSession, submitGameAnswer } from "@/services/games-client";
import { getGameSession } from "@/services/games-read-client";
import { warmAllKeepDropKinds, pickKeepDropPrompt, KEEP_COUNT, type KeepDropPrompt } from "@/lib/keep-drop-prompt";
import { getErrorMessage } from "@/lib/utils";
import type { GameSessionRow } from "@/lib/game-types";

type Result = { overlap: string[]; overlapCount: number; [userId: string]: unknown };

/** The real gameplay screen for one Keep 3, Drop 2 round -- lives at
 * /play/keep3-drop2/[sessionId], distinct from the history list at
 * /play/keep3-drop2. */
export function KeepDropRound({ session: initialSession }: { session: GameSessionRow }) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [kept, setKept] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [startingNext, setStartingNext] = useState(false);

  const prompt = session.prompt as unknown as KeepDropPrompt;
  const answeredByMe = session.game_answers.some((a) => a.user_id === userId);
  const result = session.game_results?.result as Result | undefined;
  const isVisual = !!prompt.images;

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
      const fresh = await getGameSession(session.id);
      setSession(fresh as unknown as GameSessionRow);
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't submit your picks."), "error");
    } finally {
      setSubmitting(false);
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
      <div className="mb-4 flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.push("/play/keep3-drop2")}
          aria-label="Back"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#3a362f] shadow-sm"
        >
          <XIcon size={20} />
        </button>
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[#a39d92]">{prompt.category}</p>
          <p className="truncate text-[19px] font-bold text-[#3a362f]">{session.topic}</p>
        </div>
      </div>

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
          <p className="mb-3 text-[13px] text-[#a39d92]">Tap the 3 you&apos;d keep.</p>
          <div className="grid grid-cols-2 gap-2.5">
            {prompt.items.map((item, i) => {
              const isKept = kept.includes(item);
              const image = prompt.images?.[item];
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggle(item)}
                  className={`relative overflow-hidden rounded-[18px] transition ${
                    i === prompt.items.length - 1 && prompt.items.length % 2 === 1 ? "col-span-2 mx-auto w-1/2 min-w-[45%]" : ""
                  } ${isKept ? "ring-[3px] ring-[#3a362f]" : ""}`}
                >
                  <div className="relative aspect-square w-full bg-[#f2efe9]">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className={`h-full w-full object-cover transition ${!isKept && kept.length >= KEEP_COUNT ? "opacity-50" : ""}`} />
                    ) : (
                      <div className="h-full w-full bg-black/10" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
                      <p className="truncate text-[12.5px] font-bold text-white">{item}</p>
                    </div>
                    {isKept && (
                      <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white text-[#3a362f]">
                        <Check size={13} />
                      </span>
                    )}
                  </div>
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
            {submitting ? "Submitting…" : `Lock in (${kept.length}/${KEEP_COUNT})`}
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-[13px] text-[#a39d92]">Keep exactly {KEEP_COUNT} — the rest get dropped.</p>
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
            {submitting ? "Submitting…" : `Lock in (${kept.length}/${KEEP_COUNT})`}
          </button>
        </div>
      )}
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
