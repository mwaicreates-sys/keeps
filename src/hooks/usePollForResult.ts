"use client";

import { useEffect, useRef } from "react";
import { getGameSession } from "@/services/games-read-client";
import type { GameSessionRow } from "@/lib/game-types";

const POLL_INTERVAL_MS = 3000;

/**
 * Lightweight polling for the "waiting on partner" state -- per the
 * performance pass: "if Realtime would meaningfully complicate the
 * current architecture, use lightweight polling with a short sensible
 * interval, but do not refetch provider content." This only ever reads
 * game_sessions/game_answers/game_results (a plain DB read, no
 * MusicBrainz/ListenBrainz/Wikimedia calls anywhere in that path), and
 * stops the moment a result appears or the component unmounts.
 */
export function usePollForResult(sessionId: string, waitingForResult: boolean, onResult: (session: GameSessionRow) => void) {
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (!waitingForResult) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const fresh = await getGameSession(sessionId);
        if (cancelled || !fresh) return;
        if (fresh.game_results) onResultRef.current(fresh as unknown as GameSessionRow);
      } catch {
        // Transient read failure -- just try again on the next tick.
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sessionId, waitingForResult]);
}
