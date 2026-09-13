import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TRUSTED_USER_HEADER } from "@/lib/supabase/middleware";
import type { Tables } from "@/lib/types";

export type SessionContext = {
  userId: string;
  profile: Tables<"profiles">;
  space: Tables<"spaces">;
  members: Tables<"profiles">[];
  otherMember: Tables<"profiles"> | null;
  /** Computed once here so every page/header that needs it (HomeHeader,
   * TopBar, ...) reads it off ctx instead of re-querying notifications. */
  unreadCount: number;
};

/**
 * Loads everything a server component needs to render a space-scoped page:
 * the signed-in user's profile, their space, its members, and their unread
 * notification count. Returns null when the user has no profile yet or
 * hasn't joined/created a space — callers should redirect to onboarding
 * in that case.
 *
 * Wrapped in React's `cache()`: the authenticated layout and every page
 * under it each call this, and without caching that meant the full
 * auth/profile/space lookup ran twice per navigation (once for the
 * layout, once for the page). `cache()` memoizes per request, so the
 * second call in the same render pass is free — no change to what gets
 * checked or how fresh it is, since a new request always gets a fresh
 * cache.
 *
 * The middleware already calls auth.getUser() once per request — a real
 * network round trip to Supabase's Auth server to verify the JWT — and
 * forwards the verified id via a request header it controls (see
 * lib/supabase/middleware.ts; the header is always stripped from what
 * the client sent and only re-added there, after verification, so it
 * can't be spoofed). When that header is present this trusts it instead
 * of paying for a second identical Auth-server round trip; the actual
 * data queries below still go through the normal cookie-authenticated
 * client, so RLS enforcement is completely unchanged either way. Falls
 * back to auth.getUser() if the header is somehow missing.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient();
  const trustedUserId = (await headers()).get(TRUSTED_USER_HEADER);

  let userId: string;
  if (trustedUserId) {
    userId = trustedUserId;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    userId = user.id;
  }

  // Profile and space membership are independent lookups (both only need
  // userId) — run them together instead of one after the other. Unread
  // count also only needs userId, so it joins the same round trip.
  const [{ data: profile }, { data: membership }, { count: unreadCount }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("space_members").select("space_id, spaces(*)").eq("user_id", userId).limit(1).maybeSingle(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);
  if (!profile) return null;
  if (!membership || !membership.spaces) return null;

  const space = membership.spaces as unknown as Tables<"spaces">;

  const { data: memberRows } = await supabase.from("space_members").select("profiles(*)").eq("space_id", space.id);

  const members = (memberRows ?? []).map((r) => r.profiles as unknown as Tables<"profiles">).filter(Boolean);
  const otherMember = members.find((m) => m.id !== userId) ?? null;

  return { userId, profile, space, members, otherMember, unreadCount: unreadCount ?? 0 };
});
