import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";
import { HomeHeader } from "@/components/home/HomeHeader";

// Building this page piece by piece, confirming each part before adding
// the next. Step 1: top bar only (search, logo, notifications).

export default async function HomePage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .is("read_at", null);

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader unreadCount={unreadCount ?? 0} />
    </div>
  );
}
