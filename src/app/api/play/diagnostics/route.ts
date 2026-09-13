import { NextResponse } from "next/server";
import { getSessionContext } from "@/services/session";
import { getFreshReleases, type FreshRelease } from "@/lib/listenbrainz/client";
import { mbGet, MusicBrainzHttpError } from "@/lib/musicbrainz/client";
import { lookupArtist, type ArtistLookup } from "@/services/play-providers/musicbrainz";
import { getWikimediaImageForQid } from "@/lib/wikidata/client";
import { getReleaseGroupCoverArt } from "@/lib/coverartarchive/client";

// A stable, publicly-documented example MusicBrainz artist MBID (Nirvana),
// used ONLY to verify the MusicBrainz -> Wikidata -> Wikimedia chain
// independently of search/discovery. Diagnostic-only: never returned as
// gameplay content, never imported by any game component.
const KNOWN_TEST_ARTIST_MBID = "5b11f4ce-a62d-471e-81fc-a69a8278c7da";

type Step = {
  step: string;
  status: "ok" | "failed" | "skipped";
  httpStatus?: number;
  ms: number;
  note: string;
};

function statusFromError(err: unknown): number | undefined {
  if (err instanceof MusicBrainzHttpError) return err.status;
  return (err as { status?: number } | undefined)?.status;
}

async function run<T>(step: string, fn: () => Promise<{ note: string; value?: T }>): Promise<{ step: Step; value?: T }> {
  const start = Date.now();
  try {
    const { note, value } = await fn();
    return { step: { step, status: "ok", ms: Date.now() - start, note }, value };
  } catch (err) {
    return {
      step: {
        step,
        status: "failed",
        httpStatus: statusFromError(err),
        ms: Date.now() - start,
        note: err instanceof Error ? err.message : "Unknown error",
      },
    };
  }
}

function skipped(step: string, reason: string): Step {
  return { step, status: "skipped", ms: 0, note: reason };
}

/**
 * A live, on-demand probe of every stage in the music provider chain --
 * not part of gameplay's fast path, not cached. Each stage is tested
 * independently and always reports a result (ok/failed/skipped with a
 * reason) rather than being silently omitted when an earlier stage
 * failed. No secrets involved -- everything this stack calls is
 * public/keyless.
 *
 * Restricted now that verification is done: allowed in local
 * development unconditionally (nothing sensitive to protect there), or
 * in production only for a signed-in Keeps user (there are only ever
 * two, both effectively admins of their own private space) -- a 404
 * rather than 401/403 so its existence isn't advertised to anyone else.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    const ctx = await getSessionContext();
    if (!ctx) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const steps: Step[] = [];

  // 1. listenbrainz.fresh_releases
  const lb = await run<FreshRelease[]>("listenbrainz.fresh_releases", async () => {
    const releases = await getFreshReleases();
    return { note: `${releases.length} fresh releases returned`, value: releases };
  });
  steps.push(lb.step);
  const releases = lb.value ?? [];

  // 2. musicbrainz.artist_search -- the fallback-only search path itself,
  // tested directly so a regression here is visible on its own.
  const artistSearch = await run<{ id: string; name: string } | null>("musicbrainz.artist_search", async () => {
    const data = await mbGet<{ artists?: { id: string; name: string }[] }>(`/artist?query=tag:pop&limit=1`, 0);
    const artist = data.artists?.[0] ?? null;
    return { note: artist ? `found "${artist.name}"` : "no artist returned", value: artist };
  });
  steps.push(artistSearch.step);

  // 3. musicbrainz.artist_lookup -- prefer a real MBID surfaced by
  // ListenBrainz (the actual production path); fall back to the search
  // result from step 2 only if ListenBrainz had nothing usable.
  const discoveredMbid = releases.find((r) => r.artist_mbids?.[0])?.artist_mbids?.[0] ?? artistSearch.value?.id ?? null;

  let artistLookup: { step: Step; value?: ArtistLookup } | null = null;
  if (discoveredMbid) {
    artistLookup = await run<ArtistLookup>("musicbrainz.artist_lookup", async () => {
      const lookup = await lookupArtist(discoveredMbid);
      if (!lookup) throw new Error("lookup returned no name");
      return { note: `resolved "${lookup.name}"`, value: lookup };
    });
    steps.push(artistLookup.step);
  } else {
    steps.push(skipped("musicbrainz.artist_lookup", "no artist MBID available from ListenBrainz or search"));
  }

  // 4. wikidata.artist_relation
  const qid = artistLookup?.value?.wikidataQid ?? null;
  if (artistLookup?.step.status === "ok") {
    steps.push({
      step: "wikidata.artist_relation",
      status: qid ? "ok" : "failed",
      ms: 0,
      note: qid ? `linked to ${qid}` : "artist has no Wikidata relation on MusicBrainz",
    });
  } else {
    steps.push(skipped("wikidata.artist_relation", "no artist MBID available"));
  }

  // 5. wikimedia.artist_image
  if (qid) {
    const image = await run<string | null>("wikimedia.artist_image", async () => {
      const url = await getWikimediaImageForQid(qid);
      return { note: url ? "image resolved" : "no P18 image claim on this Wikidata entity", value: url };
    });
    steps.push(image.step);
  } else {
    steps.push(skipped("wikimedia.artist_image", "no Wikidata QID available"));
  }

  // 6. musicbrainz.release_group_search -- generic tag search (the
  // fallback path only, same as before).
  const rgSearch = await run<{ id: string; title: string } | null>("musicbrainz.release_group_search", async () => {
    const data = await mbGet<{ "release-groups"?: { id: string; title: string }[] }>(
      `/release-group?query=tag:pop AND primarytype:album&limit=1`,
      0
    );
    const rg = data["release-groups"]?.[0] ?? null;
    return { note: rg ? `found "${rg.title}"` : "no release-group returned", value: rg };
  });
  steps.push(rgSearch.step);

  // 7. coverartarchive.release_group_art -- art for that generic search result.
  if (rgSearch.value) {
    const art = await run<string | null>("coverartarchive.release_group_art", async () => {
      const url = await getReleaseGroupCoverArt(rgSearch.value!.id);
      return { note: url ? "art resolved" : "no art on file", value: url };
    });
    steps.push(art.step);
  } else {
    steps.push(skipped("coverartarchive.release_group_art", "no release-group available from search"));
  }

  // Content-quality check: the *actual* preferred production path for
  // album rounds -- a real fresh release, not a generic search result.
  const freshRelease = releases.find((r) => r.release_group_mbid && r.release_name);
  if (freshRelease?.release_group_mbid) {
    const rgId = freshRelease.release_group_mbid;
    const freshArt = await run<string | null>("coverartarchive.fresh_release_art", async () => {
      const url = await getReleaseGroupCoverArt(rgId);
      return { note: url ? `art resolved for real fresh release "${freshRelease.release_name}"` : "no art on file for this fresh release", value: url };
    });
    steps.push(freshArt.step);
  } else {
    steps.push(skipped("coverartarchive.fresh_release_art", "no fresh release with a release-group MBID available"));
  }

  // Independent verification: MusicBrainz -> Wikidata -> Wikimedia using
  // a fixed, publicly-documented artist MBID, so this chain can be
  // confirmed even on a day ListenBrainz/search have nothing usable.
  // Diagnostic-only -- see the constant's own comment above.
  const knownLookup = await run<ArtistLookup>("musicbrainz.artist_lookup_known", async () => {
    const lookup = await lookupArtist(KNOWN_TEST_ARTIST_MBID);
    if (!lookup) throw new Error("lookup returned no name");
    return { note: `resolved "${lookup.name}"`, value: lookup };
  });
  steps.push(knownLookup.step);

  const knownQid = knownLookup.value?.wikidataQid ?? null;
  if (knownLookup.step.status === "ok") {
    steps.push({
      step: "wikidata.artist_relation_known",
      status: knownQid ? "ok" : "failed",
      ms: 0,
      note: knownQid ? `linked to ${knownQid}` : "known test artist has no Wikidata relation on MusicBrainz",
    });
  } else {
    steps.push(skipped("wikidata.artist_relation_known", "known-artist lookup failed"));
  }

  if (knownQid) {
    const knownImage = await run<string | null>("wikimedia.artist_image_known", async () => {
      const url = await getWikimediaImageForQid(knownQid);
      return { note: url ? "image resolved" : "no P18 image claim on this Wikidata entity", value: url };
    });
    steps.push(knownImage.step);
  } else {
    steps.push(skipped("wikimedia.artist_image_known", "no Wikidata QID available for known test artist"));
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    steps,
    summary: {
      allOk: steps.every((s) => s.status !== "failed"),
      failed: steps.filter((s) => s.status === "failed").map((s) => s.step),
      skipped: steps.filter((s) => s.status === "skipped").map((s) => s.step),
    },
  });
}
