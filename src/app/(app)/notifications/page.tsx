import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionContext } from "@/services/session";
import { createClient } from "@/lib/supabase/server";
import { NotificationsList } from "@/components/NotificationsList";

// Own header (back arrow + title) -- the Home top bar only appears on
// Home itself.

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
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <div className="flex items-center gap-2 px-3 pb-2 pt-2">
        <Link href="/home" aria-label="Back" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#3a362f]">
          <ArrowLeft size={20} strokeWidth={2} />
        </Link>
        <p className="text-[17px] font-bold tracking-tight text-[#3a362f]">Notifications</p>
      </div>

      <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/notifications?filter=${f.key}`}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium ${
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
