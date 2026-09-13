import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
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
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Profile and space membership are independent lookups (both only need
  // user.id) — run them together instead of one after the other. Unread
  // count also only needs user.id, so it joins the same round trip.
  const [{ data: profile }, { data: membership }, { count: unreadCount }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("space_members").select("space_id, spaces(*)").eq("user_id", user.id).limit(1).maybeSingle(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
  ]);
  if (!profile) return null;
  if (!membership || !membership.spaces) return null;

  const space = membership.spaces as unknown as Tables<"spaces">;

  const { data: memberRows } = await supabase.from("space_members").select("profiles(*)").eq("space_id", space.id);

  const members = (memberRows ?? []).map((r) => r.profiles as unknown as Tables<"profiles">).filter(Boolean);
  const otherMember = members.find((m) => m.id !== user.id) ?? null;

  return { userId: user.id, profile, space, members, otherMember, unreadCount: unreadCount ?? 0 };
});
