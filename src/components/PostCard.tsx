"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { ReactionBar } from "@/components/ReactionBar";
import { timeAgo, cn } from "@/lib/utils";
import { toggleReaction, addComment, toggleSaved, toggleMemory } from "@/services/posts-client";
import { useSession } from "@/components/SessionProvider";
import { MessageCircle, Bookmark, Sparkles, MapPin, Music2, Play } from "lucide-react";
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

/**
 * The single-post view used by Memory Detail — mirrors FeedPost.tsx's
 * visual language (light card, same type scale, same song-card layout)
 * since the two should read as the same product, just one card full-screen
 * instead of in a feed.
 */
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
    <article className="rounded-[26px] bg-white p-4 shadow-[0_2px_16px_-6px_rgba(20,18,15,0.12)]">
      <header className="mb-3 flex items-center gap-3">
        <Avatar name={post.author.display_name} url={post.author.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-[#3a362f]">{post.author.display_name}</p>
          <p className="text-[13px] text-[#a39d92]">
            {TYPE_LABEL[post.type] ?? post.type} · {timeAgo(post.created_at)}
          </p>
        </div>
        {isMemory && <Sparkles size={18} className="shrink-0 text-[#c99a2e]" fill="#c99a2e" aria-label="Saved to memories" />}
      </header>

      {post.media.length === 1 &&
        (post.media[0].media_type === "video" ? (
          <div className="mb-3 w-full overflow-hidden rounded-[20px] bg-black" style={{ aspectRatio: "16 / 9" }}>
            <video src={post.media[0].url} controls className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="mb-3 w-full overflow-hidden rounded-[20px]" style={{ aspectRatio: "10 / 11" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.media[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
          </div>
        ))}

      {post.media.length > 1 && (
        <div className="relative mb-3 w-full" style={{ aspectRatio: "1 / 1.15" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.media[0].url}
            alt=""
            loading="lazy"
            className="absolute left-0 top-0 h-[78%] w-[58%] -rotate-2 rounded-[20px] border-[3px] border-white object-cover shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)]"
          />
          {post.media[1] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.media[1].url}
              alt=""
              loading="lazy"
              className="absolute right-0 top-0 h-[46%] w-[44%] rotate-1 rounded-[18px] border-[3px] border-white object-cover shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)]"
            />
          )}
          {post.media[2] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.media[2].url}
              alt=""
              loading="lazy"
              className="absolute bottom-[6%] right-[4%] h-[34%] w-[35%] rotate-2 rounded-[16px] border-[3px] border-white object-cover shadow-[0_10px_20px_-6px_rgba(0,0,0,0.3)]"
            />
          )}
          {post.media.length > 3 && (
            <span className="absolute bottom-2 right-2 grid h-9 min-w-9 place-items-center rounded-full bg-white px-2 text-xs font-semibold text-[#3a362f] shadow-md">
              +{post.media.length - 3}
            </span>
          )}
        </div>
      )}

      {post.song && (
        <a
          href={post.song.url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="mb-3 flex items-start gap-3 rounded-2xl bg-[#f7f5f1] p-3.5"
        >
          {post.song.artwork_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.song.artwork_url} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-[#e9e4da]">
              <Music2 size={24} className="text-[#7c766c]" />
            </div>
          )}
          <div className="min-w-0 flex-1 py-0.5">
            <p className="truncate text-[16px] font-semibold leading-tight text-[#3a362f]">{post.song.title}</p>
            {post.song.artist && <p className="truncate text-[14px] text-[#7c766c]">{post.song.artist}</p>}
            {post.song.note && <p className="mt-1 line-clamp-2 text-[13.5px] italic text-[#7c766c]">&ldquo;{post.song.note}&rdquo;</p>}
          </div>
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#3a362f] shadow-sm">
            <Play size={15} fill="currentColor" strokeWidth={0} />
          </span>
        </a>
      )}

      {post.favorite && (
        <div className="mb-3 rounded-2xl bg-[#fdf3e0] px-3.5 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#c99a2e]">Favorite · {post.favorite.favorite_type}</p>
          <p className="text-[17px] font-bold text-[#3a362f]">{post.favorite.item_name}</p>
        </div>
      )}

      {post.caption && (
        <p className="mb-3 whitespace-pre-wrap text-[15.5px] text-[#3a362f]" style={{ lineHeight: 1.45 }}>
          {post.caption}
        </p>
      )}

      {post.place && (
        <p className="mb-3 flex items-center gap-1.5 text-[13.5px] text-[#a39d92]">
          <MapPin size={14} /> {post.place}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-[#f0ede6] pt-3">
        <ReactionBar counts={counts} mine={mine} onToggle={onReact} />
        <div className="flex items-center gap-1">
          <button
            onClick={loadComments}
            aria-label="Replies"
            className="flex h-11 items-center gap-1 rounded-full px-2.5 text-[#3a362f]"
          >
            <MessageCircle size={22} strokeWidth={1.8} />
            {post.commentCount > 0 && <span className="text-[13px] text-[#a39d92]">{post.commentCount}</span>}
          </button>
          <button
            onClick={() => {
              setSaved((s) => !s);
              toggleSaved(post.id, userId, space.id).catch(() => {});
            }}
            aria-pressed={saved}
            aria-label="Save"
            className="grid h-11 w-11 place-items-center rounded-full"
          >
            <Bookmark size={19} strokeWidth={1.8} className={cn("text-[#a39d92]", saved && "text-[#3a362f]")} fill={saved ? "#3a362f" : "none"} />
          </button>
          <button
            onClick={() => {
              setIsMemory((m) => !m);
              toggleMemory(post.id, isMemory).catch(() => {});
            }}
            aria-pressed={isMemory}
            aria-label="Keep as memory"
            className="grid h-11 w-11 place-items-center rounded-full"
          >
            <Sparkles size={19} strokeWidth={1.8} className={cn("text-[#a39d92]", isMemory && "text-[#c99a2e]")} fill={isMemory ? "#c99a2e" : "none"} />
          </button>
        </div>
      </div>

      {showComments && (
        <div className="mt-2 space-y-2.5 border-t border-[#f0ede6] pt-3">
          {(comments ?? []).map((c) => (
            <div key={c.id} className="flex gap-2 text-[14px]">
              <Avatar name={c.author?.display_name ?? "?"} url={c.author?.avatar_url} size={26} />
              <p className="text-[#3a362f]">
                <span className="font-semibold">{c.author?.display_name}</span> {c.body}
              </p>
            </div>
          ))}
          <form onSubmit={submitComment} className="flex gap-2 pt-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Reply…"
              className="flex-1 rounded-full bg-[#f7f5f1] px-3.5 py-2.5 text-[14px] text-[#3a362f] outline-none"
            />
            <button type="submit" className="rounded-full bg-[#3a362f] px-4 text-[14px] font-medium text-white">
              Send
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
