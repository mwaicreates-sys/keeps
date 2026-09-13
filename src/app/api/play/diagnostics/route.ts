import { NextResponse } from "next/server";
import { getFreshReleases } from "@/lib/listenbrainz/client";
import { mbGet } from "@/lib/musicbrainz/client";
import { getArtistImageViaWikidata } from "@/lib/wikidata/client";
import { getReleaseGroupCoverArt } from "@/lib/coverartarchive/client";

type Step = {
  step: string;
  ok: boolean;
  status?: number;
  ms: number;
  note: string;
};

async function timed<T>(step: string, fn: () => Promise<{ ok: boolean; status?: number; note: string; value?: T }>): Promise<{ step: Step; value?: T }> {
  const start = Date.now();
  try {
    const { ok, status, note, value } = await fn();
    return { step: { step, ok, status, ms: Date.now() - start, note }, value };
  } catch (err) {
    const status = (err as { status?: number })?.status;
    return { step: { step, ok: false, status, ms: Date.now() - start, note: err instanceof Error ? err.message : "Unknown error" } };
  }
}

/**
 * A live, on-demand probe of every provider in the music stack -- not
 * part of gameplay's fast path. Confirms, right now, which providers are
 * actually reachable, whether images resolve, and reports real
 * status codes (403/429/404) rather than folding every failure into a
 * generic "fallback worked" message. No secrets involved -- everything
 * this stack calls is public/keyless.
 */
export async function GET() {
  const steps: Step[] = [];

  const lb = await timed<number>("listenbrainz.fresh_releases", async () => {
    const releases = await getFreshReleases();
    return { ok: true, note: `${releases.length} fresh releases returned`, value: releases.length };
  });
  steps.push(lb.step);

  const mbArtist = await timed<{ id: string; name: string } | null>("musicbrainz.artist_search", async () => {
    const data = await mbGet<{ artists?: { id: string; name: string }[] }>(`/artist?query=tag:pop&limit=1`, 0);
    const artist = data.artists?.[0] ?? null;
    return { ok: !!artist, note: artist ? `found "${artist.name}"` : "no artist returned", value: artist };
  });
  steps.push(mbArtist.step);

  if (mbArtist.value) {
    const image = await timed<string | null>("wikidata.artist_image", async () => {
      const url = await getArtistImageViaWikidata(mbArtist.value!.id);
      return { ok: !!url, note: url ? "image resolved" : "no linked Wikidata image", value: url };
    });
    steps.push(image.step);
  }

  const mbAlbum = await timed<{ id: string; title: string } | null>("musicbrainz.release_group_search", async () => {
    const data = await mbGet<{ "release-groups"?: { id: string; title: string }[] }>(
      `/release-group?query=tag:pop AND primarytype:album&limit=1`,
      0
    );
    const rg = data["release-groups"]?.[0] ?? null;
    return { ok: !!rg, note: rg ? `found "${rg.title}"` : "no release-group returned", value: rg };
  });
  steps.push(mbAlbum.step);

  if (mbAlbum.value) {
    const art = await timed<string | null>("coverartarchive.release_group_art", async () => {
      const url = await getReleaseGroupCoverArt(mbAlbum.value!.id);
      return { ok: !!url, note: url ? "art resolved" : "no art on file", value: url };
    });
    steps.push(art.step);
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    steps,
    summary: {
      allOk: steps.every((s) => s.ok),
      failed: steps.filter((s) => !s.ok).map((s) => s.step),
    },
  });
}
