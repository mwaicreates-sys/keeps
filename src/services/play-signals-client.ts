"use client";

/**
 * Fire-and-forget familiarity signal recording -- never awaited by
 * gameplay code, never surfaces an error to the player. A dropped
 * signal just means the round generator learns a little less this
 * time, not a broken game.
 */
export function recordPlaySignal(input: {
  spaceId: string;
  itemId: string;
  itemType: string;
  source: string;
  signalType: "seen" | "selected" | "kept" | "ranked" | "skipped" | "unknown" | "swapped" | "favorite" | "dropped_in_keeps";
}): void {
  fetch("/api/play/signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => {
    // Best-effort only.
  });
}

/** Records the same signal for every real-provider item in a round --
 * used for the "seen" signal, which applies to everything shown, not
 * just what got picked. Items without a real provider id (the
 * hardcoded-pack fallback) are skipped: there's nothing to learn from
 * since there's no stable id to attach the signal to. */
export function recordPlaySignalForItems(
  items: { id: string; type: string; source: string }[],
  spaceId: string,
  signalType: Parameters<typeof recordPlaySignal>[0]["signalType"]
): void {
  for (const item of items) {
    recordPlaySignal({ spaceId, itemId: item.id, itemType: item.type, source: item.source, signalType });
  }
}
