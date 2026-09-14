/**
 * Runs `fn` over every item in `items`, at most `limit` at a time.
 *
 * Used wherever a batch of play_content_cache misses need real
 * external-provider resolution (Wikidata/Wikimedia for artist photos,
 * Cover Art Archive for album/track art) so a large pool (20-25
 * candidates) never fires that many of those requests simultaneously.
 * MusicBrainz calls need no such wrapper: they're already serialized
 * by mbGet's own in-process queue (lib/musicbrainz/client.ts)
 * regardless of how many run "concurrently" above it.
 */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return results;
}
