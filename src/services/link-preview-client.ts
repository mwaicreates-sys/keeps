"use client";

import type { LinkPreview } from "@/app/api/link-preview/route";

export type { LinkPreview };

/** Returns null on any failure (bad url, host blocked the request, no
 * recognizable metadata) rather than throwing -- callers show their own
 * "couldn't recognize that link" fallback instead of a crash. */
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as LinkPreview;
    return data.title ? data : null;
  } catch {
    return null;
  }
}
