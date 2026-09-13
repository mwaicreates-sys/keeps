/** Server-only. No key needed; a 404 just means "this release-group has
 * no art yet," not a failure. */
export async function getReleaseGroupCoverArt(mbid: string): Promise<string | null> {
  try {
    const res = await fetch(`https://coverartarchive.org/release-group/${mbid}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 * 7 }, // album art doesn't change -- cache a week
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { images?: { front?: boolean; thumbnails?: Record<string, string>; image?: string }[] };
    const front = data.images?.find((i) => i.front) ?? data.images?.[0];
    return front?.thumbnails?.large ?? front?.image ?? null;
  } catch {
    return null;
  }
}
