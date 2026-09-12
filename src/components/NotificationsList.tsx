"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markNotificationRead, markAllNotificationsRead } from "@/services/notifications-client";
import { timeAgo, cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { Bell } from "lucide-react";
import type { Tables } from "@/lib/types";

function targetHref(n: Tables<"notifications">): string {
  const data = (n.data ?? {}) as Record<string, string>;
  if (data.postId) return `/memories/${data.postId}`;
  if (data.sessionId) {
    const map: Record<string, string> = {
      this_or_that: "this-or-that",
      top5: "top5",
      blind_rank: "blind-rank",
      guess_mine: "guess-mine",
      keep3_drop2: "keep3-drop2",
    };
    return `/play/${map[data.gameType] ?? "this-or-that"}`;
  }
  if (data.fixtureId) return "/play/match-predictions";
  return "/home";
}

export function NotificationsList({ notifications, userId }: { notifications: Tables<"notifications">[]; userId: string }) {
  const [items, setItems] = useState(notifications);
  const router = useRouter();
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div>
      {unread > 0 && (
        <button
          onClick={async () => {
            setItems((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
            await markAllNotificationsRead(userId);
          }}
          className="mb-3 text-xs font-medium text-accent"
        >
          Mark all read
        </button>
      )}
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="All quiet" body="Reactions, replies, and invites will show up here." />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((n) => (
            <li key={n.id}>
              <button
                onClick={async () => {
                  setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
                  await markNotificationRead(n.id);
                  router.push(targetHref(n));
                }}
                className={cn("flex w-full items-start gap-3 px-1 py-3 text-left", !n.read_at && "bg-accent-soft/30")}
              >
                {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                <div className={cn("min-w-0 flex-1", n.read_at && "pl-5")}>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="truncate text-sm text-ink-soft">{n.body}</p>}
                  <p className="text-xs text-ink-soft">{timeAgo(n.created_at)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
