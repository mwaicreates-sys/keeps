/**
 * Server-only MusicBrainz client (only ever imported from Route Handlers/
 * server code, same convention as lib/supabase/server.ts -- never from a
 * "use client" file). Read access needs no API key, but their
 * usage policy asks for: a descriptive User-Agent, requests kept server-
 * side, and roughly 1 request/second per IP. This enforces that with an
 * in-process serialized queue (each call waits until at least 1100ms
 * after the previous one started) -- a per-warm-instance limiter, not a
 * global one, but Keeps' traffic here is two people, not a crawler.
 */
const USER_AGENT = "Keeps/1.0 ( https://keeps-ashy.vercel.app )";
const BASE_URL = "https://musicbrainz.org/ws/2";
const MIN_GAP_MS = 1100;
// Transient server-side failures (their search index hiccuping, a
// deploy, a momentary overload) -- worth one bounded retry. Never
// retried indefinitely; still respects the same 1-req/sec queue.
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const RETRY_BACKOFF_MS = 700;

let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(0, lastRequestAt + MIN_GAP_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fn();
  });
  // Keep the queue alive even if this call fails, so later calls still wait their turn.
  queue = run.catch(() => undefined);
  return run;
}

export class MusicBrainzRateLimitedError extends Error {
  constructor() {
    super("MusicBrainz rate limit hit");
    this.name = "MusicBrainzRateLimitedError";
  }
}

/** Any non-2xx MusicBrainz response that wasn't a rate limit -- carries
 * the real status so callers/diagnostics can report 503 vs 404 vs
 * anything else, rather than one generic "failed." */
export class MusicBrainzHttpError extends Error {
  status: number;
  constructor(status: number, path: string) {
    super(`MusicBrainz ${path} -> ${status}`);
    this.name = "MusicBrainzHttpError";
    this.status = status;
  }
}

async function fetchOnce(path: string, revalidateSeconds: number): Promise<Response> {
  const url = `${BASE_URL}${path}${path.includes("?") ? "&" : "?"}fmt=json`;
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    next: { revalidate: revalidateSeconds },
  });
}

/**
 * GET against MusicBrainz, throttled + failure-aware:
 * - 429: waits Retry-After (or 2s default), retries once, then throws
 *   MusicBrainzRateLimitedError.
 * - 502/503/504 (transient): retries once after a short fixed backoff,
 *   then throws MusicBrainzHttpError with the real status.
 * - anything else non-OK: throws MusicBrainzHttpError immediately, no
 *   retry (retrying a 404 or 400 endlessly would just waste the rate
 *   limit budget).
 * Never retries more than once per failure kind -- callers are expected
 * to fall back to another content source rather than block the round.
 */
export async function mbGet<T>(path: string, revalidateSeconds: number): Promise<T> {
  return throttled(async () => {
    let res = await fetchOnce(path, revalidateSeconds);

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await new Promise((r) => setTimeout(r, (Number.isFinite(retryAfter) ? retryAfter : 2) * 1000));
      res = await fetchOnce(path, revalidateSeconds);
      if (res.status === 429) throw new MusicBrainzRateLimitedError();
    } else if (RETRYABLE_STATUSES.has(res.status)) {
      await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
      res = await fetchOnce(path, revalidateSeconds);
    }

    if (!res.ok) throw new MusicBrainzHttpError(res.status, path);
    return (await res.json()) as T;
  });
}
