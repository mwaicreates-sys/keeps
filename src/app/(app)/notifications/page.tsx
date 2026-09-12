import Link from "next/link";
import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";
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
  const { data: notifications } = await query;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-4 font-display text-2xl">Notifications</h1>
      <div className="mb-4 flex gap-1 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/notifications?filter=${f.key}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${
              filter === f.key ? "border-ink bg-ink text-paper" : "border-line text-ink-soft"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <NotificationsList notifications={notifications ?? []} userId={ctx.userId} />
    </div>
  );
}
