"use client";

import { useEffect } from "react";
import { useSession } from "@/components/SessionProvider";
import { prefetchMusicPool } from "@/services/music-pool-client";

/**
 * Warms the pools every game's history page prefetches on its own
 * mount, one level earlier -- from the Play hub itself, per the perf
 * pass's "for Play home: warm likely next pools in the background."
 * Renders nothing; a no-op if a game's own history page later
 * prefetches the same (kind, count, spaceId) key, since
 * prefetchMusicPool already skips a duplicate in-flight fetch.
 */
export function PlayHomePrefetch() {
  const { space } = useSession();

  useEffect(() => {
    prefetchMusicPool("artist", 2, space.id); // This or That / Guess Mine
    prefetchMusicPool("album", 5, space.id); // Blind Rank / Keep 3 Drop 2 (one of its 3 kinds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
