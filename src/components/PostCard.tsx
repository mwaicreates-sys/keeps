"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { ReactionBar } from "@/components/ReactionBar";
import { timeAgo, cn } from "@/lib/utils";
import { toggleReaction, addComment, toggleSaved, toggleMemory } from "@/services/posts-client";
import { useSession } from "@/components/SessionProvider";
import { MessageCircle, Bookmark, Sparkles, MapPin, Music2 } from "lucide-react";
import type { FeedPost } from "@/lib/domain-types";
import type { Tables } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  photo: "Photo",
  video: "Video",
  text: "Thought",
  song: "Song",
  activity: "Activity",
  favorite: "Favorite",
  link: "Link",
  place: "Place",
  milestone: "Milestone",
  screenshot: "Screenshot",
};

export function PostCard({ post }: { post: FeedPost }) {
  const { userId, space, otherMember } = useSession();
  const [reactions, setReactions] = useState(post.reactions);
  const [saved, setSaved] = useState(post.isSaved);
  const [isMemory, setIsMemory] = useState(post.saved_to_memories);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<(Tables<"comments"> & { author: Tables<"profiles"> })[] | null>(null);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();

  const counts: Record<string, number> = {};
  for (const r of reactions) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
  const mine = new Set(reactions.filter((r) => r.user_id === userId).map((r) => r.emoji));

  function onReact(emoji: string) {
    const already = mine.has(emoji);
    setReactions((prev) =>
      already
        ? prev.filter((r) => !(r.user_id === userId && r.emoji === emoji))
        : [...prev, { id: `optimistic-${emoji}`, post_id: post.id, user_id: userId, emoji, created_at: new Date().toISOString() }]
    );
    startTransition(() => {
      toggleReaction(post.id, userId, emoji, space.id, otherMember?.id ?? null, post.author_id).catch(() => {});
    });
  }

  async function loadComments() {
    setShowComments((s) => !s);
    if (!comments) {
      const res = await fetch(`/api/comments?postId=${post.id}`).then((r) => r.json()).catch(() => []);
      setComments(res);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      post_id: post.id,
      author_id: userId,
      body,
      created_at: new Date().toISOString(),
      author: { id: userId, display_name: "You" } as Tables<"profiles">,
    };
    setComments((c) => [...(c ?? []), optimistic]);
    await addComment(post.id, userId, body, space.id, otherMember?.id ?? null, post.author_id).catch(() => {});
  }

  return (
    <article className="border-b border-line px-4 py-5 first:pt-0 md:rounded-3xl md:border md:px-5 md:py-5 md:shadow-sm">
      <header className="mb-3 flex items-center gap-2.5">
        <Avatar name={post.author.display_name} url={post.author.avatar_url} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-ink">{post.author.display_name}</p>
          <p className="text-xs text-ink-soft">
            {TYPE_LABEL[post.type] ?? post.type} · {timeAgo(post.created_at)}
          </p>
        </div>
        {isMemory && <Sparkles size={16} className="text-gold" aria-label="Saved to memories" />}
      </header>

      {post.media.length === 1 &&
        (post.media[0].media_type === "video" ? (
          <video src={post.media[0].url} controls className="mb-3 max-h-[520px] w-full rounded-2xl bg-black object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.media[0].url}
            alt=""
            loading="lazy"
            className="mb-3 max-h-[520px] w-full rounded-2xl object-cover"
          />
        ))}

      {post.media.length > 1 && (
        <div className="relative mb-3 aspect-[4/5] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.media[0].url}
            alt=""
            loading="lazy"
            className="absolute left-0 top-0 h-[85%] w-[82%] -rotate-2 rounded-2xl border-4 border-paper object-cover shadow-md"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.media[1].url}
            alt=""
            loading="lazy"
            className="absolute bottom-0 right-0 h-[55%] w-[55%] rotate-3 rounded-2xl border-4 border-paper object-cover shadow-lg"
          />
          {post.media.length > 2 && (
            <span className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-ink/80 text-xs font-semibold text-paper">
              +{post.media.length - 2}
            </span>
          )}
        </div>
      )}

      {post.song && (
        <a
          href={post.song.url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="mb-3 flex items-center gap-3 rounded-2xl border border-line bg-paper px-3 py-2.5"
        >
          {post.song.artwork_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.song.artwork_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-accent-soft">
              <Music2 size={20} className="text-accent" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{post.song.title}</p>
            <p className="truncate text-xs text-ink-soft">{post.song.artist}</p>
          </div>
        </a>
      )}

      {post.favorite && (
        <div className="mb-3 rounded-2xl border border-dashed border-gold/50 bg-accent-soft/40 px-3 py-2.5">
          <p className="text-xs uppercase tracking-wide text-gold">Favorite · {post.favorite.favorite_type}</p>
          <p className="font-display text-lg">{post.favorite.item_name}</p>
        </div>
      )}

      {post.caption && <p className="mb-3 whitespace-pre-wrap text-[15px] leading-relaxed">{post.caption}</p>}

      {post.place && (
        <p className="mb-3 flex items-center gap-1 text-xs text-ink-soft">
          <MapPin size={12} /> {post.place}
        </p>
      )}

      <div className="flex items-center justify-between">
        <ReactionBar counts={counts} mine={mine} onToggle={onReact} />
        <div className="flex items-center gap-1">
          <button
            onClick={loadComments}
            aria-label="Replies"
            className="flex h-9 items-center gap-1 rounded-full px-2.5 text-ink-soft hover:bg-accent-soft"
          >
            <MessageCircle size={18} />
            {post.commentCount > 0 && <span className="text-xs">{post.commentCount}</span>}
          </button>
          <button
            onClick={() => {
              setSaved((s) => !s);
              toggleSaved(post.id, userId, space.id).catch(() => {});
            }}
            aria-pressed={saved}
            aria-label="Save"
            className={cn("grid h-9 w-9 place-items-center rounded-full hover:bg-accent-soft", saved && "text-accent")}
          >
            <Bookmark size={18} fill={saved ? "var(--accent)" : "none"} />
          </button>
          <button
            onClick={() => {
              setIsMemory((m) => !m);
              toggleMemory(post.id, isMemory).catch(() => {});
            }}
            aria-pressed={isMemory}
            aria-label="Keep as memory"
            className={cn("grid h-9 w-9 place-items-center rounded-full hover:bg-accent-soft", isMemory && "text-gold")}
          >
            <Sparkles size={18} fill={isMemory ? "var(--gold)" : "none"} />
          </button>
        </div>
      </div>

      {showComments && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          {(comments ?? []).map((c) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <Avatar name={c.author?.display_name ?? "?"} url={c.author?.avatar_url} size={24} />
              <p>
                <span className="font-medium">{c.author?.display_name}</span> {c.body}
              </p>
            </div>
          ))}
          <form onSubmit={submitComment} className="flex gap-2 pt-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Reply…"
              className="flex-1 rounded-full border border-line bg-paper px-3.5 py-2 text-sm outline-none focus:border-accent"
            />
            <button type="submit" className="rounded-full bg-ink px-4 text-sm font-medium text-paper">
              Send
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
