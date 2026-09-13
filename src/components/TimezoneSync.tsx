"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/SessionProvider";

/**
 * Best-effort, fire-and-forget: persists the browser's real IANA
 * timezone to profiles.timezone (always kept current per-player) and,
 * only if the space doesn't have one yet, initializes space.timezone
 * from it too -- shared daily-run games (This or That, Guess Mine,
 * Blind Rank, Keep 3 Drop 2, Top 5) key their run_date off the space's
 * timezone, never a per-player one, so both members always resolve
 * the same calendar day (see game-runs-server.ts's getSpaceTimezone).
 * Once set, space.timezone is deliberately left alone here -- "allow
 * it to be updated later" means a real settings action, not silently
 * overwritten by whichever member happens to open the app next.
 * Falls back to UTC (never a hardcoded region) until either is known.
 * Renders nothing.
 */
export function TimezoneSync() {
  const { userId, profile, space } = useSession();

  useEffect(() => {
    let detected: string;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!detected) return;
    const supabase = createClient();
    if (detected !== profile.timezone) {
      void supabase.from("profiles").update({ timezone: detected }).eq("id", userId);
    }
    if (!space.timezone) {
      void supabase.from("spaces").update({ timezone: detected }).eq("id", space.id);
    }
  }, [userId, profile.timezone, space.id, space.timezone]);

  return null;
}
