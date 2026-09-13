/**
 * Local-calendar-day math for the daily Play run/cap, without pulling
 * in a timezone library -- Node's built-in Intl already carries the
 * IANA tz database, which is all this needs.
 *
 * Per the product rule: daily resets must follow the player's own
 * local calendar day, never a hardcoded region and never UTC-as-a-
 * stand-in-for-everyone. A profile with no stored timezone yet falls
 * back to plain UTC (a neutral default, not a guess at any specific
 * country) until the client reports the browser's real zone (see
 * TimezoneSync, which best-effort-persists it to profiles.timezone).
 */

export const DEFAULT_TIMEZONE = "UTC";

/** Validates a string is a real IANA timezone Intl can resolve, so a
 * corrupt/garbage stored value can never crash a date computation --
 * it just falls back to DEFAULT_TIMEZONE instead. */
export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(tz: string | null | undefined): string {
  return isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
}

/** The UTC-minus-local offset (in minutes) such that `local time =
 * instant + offset` for the given IANA zone at the given instant. */
function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - instant.getTime()) / 60000;
}

/** "YYYY-MM-DD" for the given instant, in the given zone -- the value
 * stored as game_runs.run_date, and compared as the run's calendar day. */
export function localDateString(instant: Date, timeZone: string): string {
  const offsetMin = tzOffsetMinutes(instant, timeZone);
  const local = new Date(instant.getTime() + offsetMin * 60000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const d = String(local.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The UTC instant of local midnight, for the calendar day containing
 * `instant` in `timeZone` -- the query boundary for "since the start of
 * today, this player's time." Small DST-transition-day error (a minute
 * or two) is an accepted tradeoff for not pulling in a full tz-database
 * library just for day bucketing. */
export function startOfLocalDayUtc(instant: Date, timeZone: string): Date {
  const offsetMin = tzOffsetMinutes(instant, timeZone);
  const local = new Date(instant.getTime() + offsetMin * 60000);
  const localMidnightAsUtcMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(localMidnightAsUtcMs - offsetMin * 60000);
}
