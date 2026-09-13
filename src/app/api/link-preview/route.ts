import { NextRequest, NextResponse } from "next/server";

export type LinkPreview = {
  title: string;
  subtitle: string | null;
  artworkUrl: string | null;
  source: string;
  url: string;
};

const FETCH_TIMEOUT_MS = 6000;

/**
 * Server-side link recognition for the Music and Favorite Drop composers
 * -- runs here (not in the browser) specifically to avoid CORS, since a
 * couple of these hosts don't reliably allow cross-origin reads from a
 * page's own JS. Known music hosts go through their public oEmbed
 * endpoint (a clean, structured title/artist/artwork); everything else
 * (including Apple Music, which has no public oEmbed) falls back to
 * reading the page's own Open Graph tags. Never fabricates a
 * title/artist/artwork it couldn't actually read.
 */
async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** "Song Name - Artist" / "Song Name · Artist" / "Song Name by Artist" -> parts.
 * Falls back to the whole string as the title when no separator is found. */
function splitTitleSubtitle(raw: string): { title: string; subtitle: string | null } {
  for (const sep of [" · ", " — ", " - ", " by "]) {
    const idx = raw.indexOf(sep);
    if (idx > 0) {
      return { title: raw.slice(0, idx).trim(), subtitle: raw.slice(idx + sep.length).trim() };
    }
  }
  return { title: raw.trim(), subtitle: null };
}

async function fromOEmbed(oembedUrl: string, sourceName: string, targetUrl: string): Promise<LinkPreview | null> {
  const res = await fetchWithTimeout(oembedUrl);
  if (!res.ok) return null;
  const data = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
  if (!data.title) return null;
  const { title, subtitle } = data.author_name
    ? { title: data.title.trim(), subtitle: data.author_name.trim() }
    : splitTitleSubtitle(data.title);
  return { title, subtitle, artworkUrl: data.thumbnail_url ?? null, source: sourceName, url: targetUrl };
}

function extractMeta(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, "i"),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match) return match[1];
  }
  return null;
}

async function fromOpenGraph(targetUrl: string, fallbackSourceName: string): Promise<LinkPreview | null> {
  const res = await fetchWithTimeout(targetUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; KeepsLinkPreview/1.0; +https://keeps-ashy.vercel.app)" },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const ogTitle = extractMeta(html, "og:title");
  if (!ogTitle) return null;

  const ogImage = extractMeta(html, "og:image");
  const siteName = extractMeta(html, "og:site_name") ?? fallbackSourceName;
  const { title, subtitle } = splitTitleSubtitle(ogTitle);
  return {
    title,
    subtitle: subtitle ?? extractMeta(html, "og:description"),
    artworkUrl: ogImage,
    source: siteName,
    url: targetUrl,
  };
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const host = parsed.hostname.replace(/^www\./, "");

  try {
    let preview: LinkPreview | null;

    if (host.endsWith("spotify.com")) {
      preview = await fromOEmbed(`https://open.spotify.com/oembed?url=${encodeURIComponent(target)}`, "Spotify", target);
    } else if (host.endsWith("youtube.com") || host === "youtu.be") {
      preview = await fromOEmbed(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(target)}`,
        "YouTube",
        target
      );
    } else if (host.endsWith("soundcloud.com")) {
      preview = await fromOEmbed(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(target)}`, "SoundCloud", target);
    } else if (host.endsWith("music.apple.com")) {
      preview = await fromOpenGraph(target, "Apple Music");
    } else {
      preview = await fromOpenGraph(target, host);
    }

    if (!preview) return NextResponse.json({ error: "Couldn't read that link" }, { status: 422 });
    return NextResponse.json(preview);
  } catch {
    return NextResponse.json({ error: "Couldn't read that link" }, { status: 502 });
  }
}
