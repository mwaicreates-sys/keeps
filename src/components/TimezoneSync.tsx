"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/SessionProvider";

/**
 * Best-effort, fire-and-forget: persists the browser's real IANA
 * timezone to profiles.timezone so the server can compute this
 * player's actual local calendar day for the daily Play cap/run reset
 * (see lib/timezone.ts) instead of defaulting to plain UTC. Only
 * writes when the detected zone differs from what's already stored, so
 * this is a no-op on every render after the first sync (or after the
 * player travels and it changes again). Renders nothing.
 */
export function TimezoneSync() {
  const { userId, profile } = useSession();

  useEffect(() => {
    let detected: string;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!detected || detected === profile.timezone) return;
    const supabase = createClient();
    void supabase.from("profiles").update({ timezone: detected }).eq("id", userId);
  }, [userId, profile.timezone]);

  return null;
}
