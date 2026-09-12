import Link from "next/link";
import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";
import { HomeHeader } from "@/components/home/HomeHeader";
import { PageIntro } from "@/components/app/PageIntro";
import { NotificationsList } from "@/components/NotificationsList";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "social", label: "Social" },
  { key: "play", label: "Play" },
  { key: "memories", label: "Memories" },
] as const;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: (typeof FILTERS)[number]["key"] }>;
}) {
  const { filter = "all" } = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter !== "all") query = query.eq("category", filter);
  const [{ data: notifications }, { count: unreadCount }] = await Promise.all([
    query,
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).is("read_at", null),
  ]);

  return (
    <div className="mx-auto max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader unreadCount={unreadCount ?? 0} />

      <PageIntro title="Notifications" subtitle="Everything you might have missed." />

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/notifications?filter=${f.key}`}
            className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium ${
              filter === f.key ? "bg-[#3a362f] text-white" : "bg-white text-[#7c766c]"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="px-4">
        <NotificationsList notifications={notifications ?? []} userId={ctx.userId} />
      </div>
    </div>
  );
}
