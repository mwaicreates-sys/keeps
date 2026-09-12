"use client";

import { useState } from "react";
import { PostHeader } from "@/components/home/PostHeader";
import { PhotoCollage } from "@/components/home/PhotoCollage";
import { ActivityPost } from "@/components/home/ActivityPost";
import { PostActions } from "@/components/home/PostActions";
import { Avatar } from "@/components/Avatar";
import { addComment } from "@/services/posts-client";
import { useSession } from "@/components/SessionProvider";
import { Music2, Play } from "lucide-react";
import type { FeedPost as FeedPostData } from "@/lib/domain-types";
import type { Tables } from "@/lib/types";

export function FeedPost({ post }: { post: FeedPostData }) {
  const { userId, space, otherMember } = useSession();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<(Tables<"comments"> & { author: Tables<"profiles"> })[] | null>(null);
  const [draft, setDraft] = useState("");

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
    setComments((c) => [
      ...(c ?? []),
      {
        id: `optimistic-${Date.now()}`,
        post_id: post.id,
        author_id: userId,
        body,
        created_at: new Date().toISOString(),
        author: { id: userId, display_name: "You" } as Tables<"profiles">,
      },
    ]);
    await addComment(post.id, userId, body, space.id, otherMember?.id ?? null, post.author_id).catch(() => {});
  }

  return (
    <article className="mx-4 mb-4 rounded-[26px] bg-white p-3 shadow-[0_2px_16px_-6px_rgba(20,18,15,0.12)]">
      <PostHeader
        author={post.author}
        type={post.type}
        caption={post.caption}
        mediaCount={post.media.length}
        createdAt={post.created_at}
      />

      {post.type === "activity" && post.place ? (
        <ActivityPost place={post.place} />
      ) : post.media.length > 0 ? (
        <PhotoCollage media={post.media} />
      ) : null}

      {post.song && (
        <a
          href={post.song.url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="mt-2.5 flex items-start gap-3 rounded-2xl bg-[#f7f5f1] p-3.5"
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
            {post.song.artist && (
              <p className="truncate text-[13.5px] leading-snug text-[#7c766c]">{post.song.artist}</p>
            )}
            {post.song.album && (
              <p className="truncate text-[12.5px] leading-snug text-[#a39d92]">{post.song.album}</p>
            )}
            {post.song.note && (
              <p className="mt-1 line-clamp-2 text-[13px] italic leading-snug text-[#7c766c]">&ldquo;{post.song.note}&rdquo;</p>
            )}
          </div>
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#3a362f] shadow-sm">
            <Play size={13} fill="currentColor" strokeWidth={0} />
          </span>
        </a>
      )}

      {post.favorite && (
        <div className="mt-2.5 rounded-2xl bg-[#fdf3e0] px-3.5 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-[#c99a2e]">Favorite · {post.favorite.favorite_type}</p>
          <p className="text-base font-semibold text-[#3a362f]">{post.favorite.item_name}</p>
        </div>
      )}

      {post.caption && post.type !== "activity" && (
        <p className="mt-2.5 px-1 text-[14px] leading-relaxed text-[#3a362f]">{post.caption}</p>
      )}

      <PostActions
        postId={post.id}
        postAuthorId={post.author_id}
        reactions={post.reactions}
        saved={post.isSaved}
        isMemory={post.saved_to_memories}
        onToggleComments={loadComments}
      />

      {showComments && (
        <div className="mt-2 space-y-2 border-t border-[#f0ede6] px-1 pt-2.5">
          {(comments ?? []).map((c) => (
            <div key={c.id} className="flex gap-2 text-[13px]">
              <Avatar name={c.author?.display_name ?? "?"} url={c.author?.avatar_url} size={22} />
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
              className="flex-1 rounded-full bg-[#f7f5f1] px-3.5 py-2 text-sm outline-none"
            />
            <button type="submit" className="rounded-full bg-[#3a362f] px-4 text-sm font-medium text-white">
              Send
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
