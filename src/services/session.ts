import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/types";

export type SessionContext = {
  userId: string;
  profile: Tables<"profiles">;
  space: Tables<"spaces">;
  members: Tables<"profiles">[];
  otherMember: Tables<"profiles"> | null;
};

/**
 * Loads everything a server component needs to render a space-scoped page:
 * the signed-in user's profile, their space, and its members. Returns null
 * when the user has no profile yet or hasn't joined/created a space —
 * callers should redirect to onboarding in that case.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: membership } = await supabase
    .from("space_members")
    .select("space_id, spaces(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership || !membership.spaces) return null;

  const space = membership.spaces as unknown as Tables<"spaces">;

  const { data: memberRows } = await supabase
    .from("space_members")
    .select("profiles(*)")
    .eq("space_id", space.id);

  const members = (memberRows ?? [])
    .map((r) => r.profiles as unknown as Tables<"profiles">)
    .filter(Boolean);

  const otherMember = members.find((m) => m.id !== user.id) ?? null;

  return { userId: user.id, profile, space, members, otherMember };
}
