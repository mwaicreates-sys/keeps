"use client";

import { useEffect, useRef } from "react";
import { getGameSession } from "@/services/games-read-client";
import type { GameSessionRow } from "@/lib/game-types";

const POLL_INTERVAL_MS = 3000;

/**
 * Generic lightweight polling primitive -- per the performance pass:
 * "if Realtime would meaningfully complicate the current architecture,
 * use lightweight polling with a short sensible interval, but do not
 * refetch provider content." `tick` should only ever do a plain DB
 * read (game_sessions, match_fixtures, ...), never touch a content
 * provider. Stops the moment `active` goes false or the component
 * unmounts.
 */
export function usePoll(active: boolean, tick: () => Promise<void>) {
  const tickRef = useRef(tick);
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      try {
        await tickRef.current();
      } catch {
        // Transient read failure -- just try again on the next tick.
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [active]);
}

/**
 * The game_sessions-specific case: polls for a result while waiting on
 * the partner, and hands back the fresh session the moment one
 * appears -- used by every music-game Round component's "waiting on
 * partner" state.
 */
export function usePollForResult(sessionId: string, waitingForResult: boolean, onResult: (session: GameSessionRow) => void) {
  usePoll(waitingForResult, async () => {
    const fresh = await getGameSession(sessionId);
    if (fresh?.game_results) onResult(fresh as unknown as GameSessionRow);
  });
}
