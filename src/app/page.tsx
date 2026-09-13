import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSessionContext } from "@/services/session";
import { TRUSTED_USER_HEADER } from "@/lib/supabase/middleware";

export default async function RootPage() {
  // Middleware already verified auth for this request (a real round trip
  // to Supabase's Auth server) and forwarded the result via this header
  // — reading it here instead of calling auth.getUser() again avoids a
  // second, identical Auth-server round trip on every cold app launch.
  const trustedUserId = (await headers()).get(TRUSTED_USER_HEADER);
  if (!trustedUserId) redirect("/login");

  const ctx = await getSessionContext();
  if (!ctx) redirect("/space/create");

  redirect("/home");
}
