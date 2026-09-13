import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/space/create", "/space/join", "/auth"];

/** Exported so getSessionContext() and the root page can read the same
 * header this middleware sets, without hardcoding the name twice. */
export const TRUSTED_USER_HEADER = "x-keeps-verified-user-id";

/**
 * Refreshes the Supabase auth session on every request and redirects
 * unauthenticated visitors to /login. This is the source of truth for
 * gating access — nothing here relies on client-side checks.
 *
 * auth.getUser() here makes a real round trip to Supabase's Auth server
 * to verify the JWT. Once verified, the result is forwarded to Server
 * Components via a request header, so getSessionContext() doesn't have
 * to make that same round trip again for the same request — this header
 * is always deleted from whatever the client sent and only ever
 * re-added here, after verification, so it can't be spoofed.
 */
export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(TRUSTED_USER_HEADER);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p)) || path === "/";

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  if (user) {
    // Rebuild the response so the request Server Components see carries
    // the verified-user header, but carry forward any cookies setAll()
    // already staged above (e.g. a refreshed session token) — otherwise
    // rebuilding the response here would silently drop them.
    const pendingCookies = response.headers.getSetCookie();
    requestHeaders.set(TRUSTED_USER_HEADER, user.id);
    response = NextResponse.next({ request: { headers: requestHeaders } });
    for (const cookie of pendingCookies) {
      response.headers.append("set-cookie", cookie);
    }
  }

  return response;
}
