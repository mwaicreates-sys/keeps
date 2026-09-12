"use client";

import { createClient } from "@/lib/supabase/client";
import { generateInviteCode } from "@/lib/utils";

export async function signUp(email: string, password: string, displayName: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  const user = data.user;
  if (!user) throw new Error("Sign up did not return a user. Check your inbox to confirm your email.");

  const handle = (displayName || email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20) || `keeper${Math.floor(Math.random() * 10000)}`;

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    display_name: displayName || "New Keeper",
    handle,
  });
  if (profileError && profileError.code !== "23505") throw profileError;

  return user;
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function createSpace(name: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const inviteCode = generateInviteCode();
  const { data: space, error } = await supabase
    .from("spaces")
    .insert({ name: name || "Our Space", invite_code: inviteCode, created_by: user.id })
    .select()
    .single();
  if (error) throw error;

  const { error: memberError } = await supabase
    .from("space_members")
    .insert({ space_id: space.id, user_id: user.id, role: "owner" });
  if (memberError) throw memberError;

  return space;
}

export async function joinSpace(code: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("join_space_by_invite", {
    code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  return data;
}
