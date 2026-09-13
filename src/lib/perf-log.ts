/**
 * Server-side-only timing instrumentation -- per the performance pass's
 * own rule ("report actual timings before changing architecture, do
 * not guess"). Every call logs a single structured line; never thrown,
 * never blocks the caller, never sent to the client.
 */
export async function timed<T>(label: string, fn: () => Promise<T>, extra?: Record<string, unknown>): Promise<T> {
  const start = Date.now();
  let ok = true;
  try {
    return await fn();
  } catch (err) {
    ok = false;
    throw err;
  } finally {
    console.log("[perf]", JSON.stringify({ label, ms: Date.now() - start, ok, ...extra }));
  }
}

export function logPerf(label: string, ms: number, extra?: Record<string, unknown>): void {
  console.log("[perf]", JSON.stringify({ label, ms, ...extra }));
}
