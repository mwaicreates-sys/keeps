"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createDrop, type DropType } from "@/services/posts-client";
import { createStory } from "@/services/stories-client";
import { cn } from "@/lib/utils";
import { Image as ImageIcon, Video, Music2, Type, Activity, Star } from "lucide-react";

const DROP_TYPES: { type: DropType; label: string; icon: typeof ImageIcon }[] = [
  { type: "photo", label: "Photo", icon: ImageIcon },
  { type: "video", label: "Video", icon: Video },
  { type: "song", label: "Song", icon: Music2 },
  { type: "text", label: "Text", icon: Type },
  { type: "activity", label: "Activity", icon: Activity },
  { type: "favorite", label: "Favorite", icon: Star },
];

const FAVORITE_KINDS = ["Song", "Album", "Player", "Game", "Movie", "Show", "Place", "Memory", "Other"];

export default function DropPage() {
  const isStory = useSearchParams().get("story") === "1";
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();

  const [type, setType] = useState<DropType>("photo");
  const [caption, setCaption] = useState("");
  const [place, setPlace] = useState("");
  const [tags, setTags] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [files, setFiles] = useState<File[]>([]);
  const [song, setSong] = useState({ title: "", artist: "", album: "", url: "", artworkUrl: "", note: "" });
  const [favorite, setFavorite] = useState({ favoriteType: "Song", itemName: "", note: "" });
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isStory) {
        const storyType: "photo" | "video" | "text" | "song" =
          type === "photo" || type === "video" || type === "song" ? type : "text";
        await createStory({
          spaceId: space.id,
          authorId: userId,
          otherMemberId: otherMember?.id ?? null,
          type: storyType,
          file: files[0],
          textContent: caption || undefined,
          song: type === "song" ? song : undefined,
        });
        show("Story posted — it'll fade in 24h.");
      } else {
        await createDrop({
          spaceId: space.id,
          authorId: userId,
          otherMemberId: otherMember?.id ?? null,
          type,
          caption: caption || undefined,
          place: place || undefined,
          occurredAt: new Date(occurredAt).toISOString(),
          tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
          mediaFiles: files.length ? files : undefined,
          song: type === "song" ? song : undefined,
          favorite: type === "favorite" ? favorite : undefined,
        });
        show("Dropped. It's on Home now.");
      }
      router.push("/home");
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Couldn't post that.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const needsMedia = type === "photo" || type === "video";

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-1 font-display text-2xl">{isStory ? "New story" : "Drop something"}</h1>
      <p className="mb-5 text-sm text-ink-soft">
        {isStory ? "Visible for 24 hours, unless you save it." : "It lands on Home right away."}
      </p>

      <div className="mb-6 grid grid-cols-3 gap-2">
        {DROP_TYPES.map(({ type: t, label, icon: Icon }) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-xs transition",
              type === t ? "border-accent bg-accent-soft text-accent" : "border-line text-ink-soft"
            )}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {needsMedia && (
          <div>
            <label className="mb-1.5 block text-sm text-ink-soft">
              {type === "photo" ? "Photo" : "Video"}
            </label>
            <input
              type="file"
              accept={type === "photo" ? "image/*" : "video/*"}
              multiple={type === "photo" && !isStory}
              required={!isStory || type === "photo" || type === "video"}
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm"
            />
          </div>
        )}

        {type === "song" && (
          <div className="space-y-3 rounded-2xl border border-line p-3.5">
            <input
              required
              placeholder="Song title"
              value={song.title}
              onChange={(e) => setSong({ ...song, title: e.target.value })}
              className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm"
            />
            <input
              placeholder="Artist"
              value={song.artist}
              onChange={(e) => setSong({ ...song, artist: e.target.value })}
              className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm"
            />
            <input
              placeholder="Spotify / Apple Music link"
              value={song.url}
              onChange={(e) => setSong({ ...song, url: e.target.value })}
              className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm"
            />
            <input
              placeholder="Artwork URL (optional)"
              value={song.artworkUrl}
              onChange={(e) => setSong({ ...song, artworkUrl: e.target.value })}
              className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm"
            />
          </div>
        )}

        {type === "favorite" && (
          <div className="space-y-3 rounded-2xl border border-line p-3.5">
            <select
              value={favorite.favoriteType}
              onChange={(e) => setFavorite({ ...favorite, favoriteType: e.target.value })}
              className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm"
            >
              {FAVORITE_KINDS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <input
              required
              placeholder="What is it?"
              value={favorite.itemName}
              onChange={(e) => setFavorite({ ...favorite, itemName: e.target.value })}
              className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm text-ink-soft">
            {type === "text" ? "Your thought" : "Caption"}
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            required={type === "text"}
            rows={3}
            className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>

        {!isStory && (
          <>
            {type === "activity" && (
              <input
                placeholder="Where? (optional)"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm"
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm text-ink-soft">Date</label>
                <input
                  type="date"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                  className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-ink-soft">Tags</label>
                <input
                  placeholder="trip, funny"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-ink py-3.5 text-[15px] font-medium text-paper transition active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? "Posting…" : isStory ? "Post story" : "Drop it"}
        </button>
      </form>
    </div>
  );
}
