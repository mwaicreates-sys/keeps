"use client";

import { useEffect } from "react";
import { useSession } from "@/components/SessionProvider";
import { warmAllChoiceKinds } from "@/lib/choice-prompt";
import { warmAllBlindRankKinds } from "@/lib/blind-rank-prompt";

/**
 * Warms the pools every game's history page prefetches on its own
 * mount, one level earlier -- from the Play hub itself, per the perf
 * pass's "for Play home: warm likely next pools in the background."
 * Renders nothing; a no-op if a game's own round screen later
 * prefetches the same (kind, count, spaceId) key, since the
 * prefetch cache already skips a duplicate in-flight fetch.
 */
export function PlayHomePrefetch() {
  const { space } = useSession();

  useEffect(() => {
    warmAllChoiceKinds(space.id); // This or That / Guess Mine
    warmAllBlindRankKinds(space.id); // Blind Rank (Keep 3 Drop 2 warms its own separate set)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
