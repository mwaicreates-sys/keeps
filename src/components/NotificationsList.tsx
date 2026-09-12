"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Camera,
  Music2,
  Gamepad2,
  Trophy,
  Sparkles,
  Bookmark,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { markNotificationRead, markAllNotificationsRead } from "@/services/notifications-client";
import { timeAgo, cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
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

const TYPE_STYLE: Record<string, { icon: LucideIcon; bg: string; color: string }> = {
  new_drop: { icon: Camera, bg: "#fbe9ec", color: "#c2495f" },
  reaction: { icon: Heart, bg: "#fbe9ec", color: "#c2495f" },
  reply: { icon: MessageCircle, bg: "#e5eef6", color: "#2f6fa3" },
  story_activity: { icon: Music2, bg: "#e5eef6", color: "#2f6fa3" },
  game_invite: { icon: Gamepad2, bg: "#eaeafb", color: "#5457c7" },
  game_answer: { icon: Gamepad2, bg: "#eaeafb", color: "#5457c7" },
  game_ready: { icon: Trophy, bg: "#faf1e2", color: "#a3742b" },
  prediction_settled: { icon: Trophy, bg: "#faf1e2", color: "#a3742b" },
  memory_resurfaced: { icon: Sparkles, bg: "#fdf3e0", color: "#c99a2e" },
  saved_memory: { icon: Bookmark, bg: "#fdf3e0", color: "#c99a2e" },
};

export function NotificationsList({ notifications, userId }: { notifications: Tables<"notifications">[]; userId: string }) {
  const [items, setItems] = useState(notifications);
  const router = useRouter();
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div>
      {unread > 0 && (
        <div className="mb-3 flex justify-end">
          <button
            onClick={async () => {
              setItems((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
              await markAllNotificationsRead(userId);
            }}
            className="rounded-full bg-white px-3.5 py-2 text-[13px] font-medium text-[#3a362f] shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]"
          >
            Mark all read
          </button>
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState icon={Bell} title="All quiet" body="Reactions, replies, and invites will show up here." />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const style = TYPE_STYLE[n.type] ?? { icon: Bell, bg: "#f2efe9", color: "#7c766c" };
            const Icon = style.icon;
            return (
              <li key={n.id}>
                <button
                  onClick={async () => {
                    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
                    await markNotificationRead(n.id);
                    router.push(targetHref(n));
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl bg-white px-3.5 py-3 text-left shadow-[0_2px_10px_-6px_rgba(20,18,15,0.12)]",
                    !n.read_at && "ring-1 ring-[#3b82f6]/25"
                  )}
                >
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                    style={{ backgroundColor: style.bg, color: style.color }}
                  >
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="truncate text-[14.5px] font-semibold text-[#3a362f]">{n.title}</p>
                    {n.body && <p className="truncate text-[13.5px] text-[#7c766c]">{n.body}</p>}
                    <p className="mt-0.5 text-[12px] text-[#a39d92]">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#3b82f6]" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
