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

async function fetchOnce(path: string, revalidateSeconds: number): Promise<Response> {
  const url = `${BASE_URL}${path}${path.includes("?") ? "&" : "?"}fmt=json`;
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    next: { revalidate: revalidateSeconds },
  });
}

/** GET against MusicBrainz, throttled + 429-aware. Retries once after
 * Retry-After (or a 2s default), then gives up -- callers are expected to
 * fall back to another content source rather than block the round. */
export async function mbGet<T>(path: string, revalidateSeconds: number): Promise<T> {
  return throttled(async () => {
    let res = await fetchOnce(path, revalidateSeconds);
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await new Promise((r) => setTimeout(r, (Number.isFinite(retryAfter) ? retryAfter : 2) * 1000));
      res = await fetchOnce(path, revalidateSeconds);
      if (res.status === 429) throw new MusicBrainzRateLimitedError();
    }
    if (!res.ok) throw new Error(`MusicBrainz ${path} -> ${res.status}`);
    return (await res.json()) as T;
  });
}
