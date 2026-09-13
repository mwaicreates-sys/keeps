"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Music2, ExternalLink } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createDrop, type DropType } from "@/services/posts-client";
import { createStory } from "@/services/stories-client";
import { addToCollection } from "@/services/collections-client";
import { getErrorMessage } from "@/lib/utils";
import { MediaPicker } from "@/components/drop/MediaPicker";

const FAVORITE_KINDS = ["Song", "Album", "Footballer", "Game", "Movie", "Show", "Place", "Memory", "Other"];

const TYPE_LABEL: Record<DropType, string> = {
  photo: "Photos",
  video: "Video",
  song: "Song",
  text: "Text",
  activity: "Activity",
  favorite: "Favorite",
  link: "Link",
  place: "Place",
  milestone: "Milestone",
  screenshot: "Screenshot",
};

function fieldClass() {
  return "w-full rounded-2xl bg-[#f7f5f1] px-4 py-3 text-[15px] text-[#3a362f] outline-none placeholder:text-[#a39d92] focus:bg-[#f2efe9]";
}

/**
 * The type-specific composer that opens after a Drop type is chosen.
 * Every mutation here is exactly what the previous single-page form did
 * (createDrop / createStory / addToCollection) — only the surface around
 * it changed.
 */
export function DropComposer({
  type,
  isStory,
  collections,
  initialCaption,
  onClose,
}: {
  type: DropType;
  isStory: boolean;
  collections: { id: string; name: string }[];
  /** Prefills the caption field -- used when the quick-capture bar on the
   * Drop landing page already collected what to say before a type (text)
   * was even chosen. */
  initialCaption?: string;
  onClose: () => void;
}) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();

  const [caption, setCaption] = useState(initialCaption ?? "");
  const [place, setPlace] = useState("");
  const [tags, setTags] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [files, setFiles] = useState<File[]>([]);
  const [song, setSong] = useState({ title: "", artist: "", album: "", url: "", artworkUrl: "", note: "" });
  const [favorite, setFavorite] = useState({ favoriteType: "Song", itemName: "", note: "" });
  const [submitting, setSubmitting] = useState(false);

  const needsMedia = type === "photo" || type === "video";
  const canOfferCollection = type === "photo" || type === "video" || type === "song" || type === "favorite";

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
        const post = await createDrop({
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
        if (collectionId) await addToCollection(collectionId, post.id);
        show("Dropped. It's on Home now.");
      }
      router.push("/home");
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't post that."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-6">
      <div className="mb-4 flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#3a362f] shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-[19px] font-bold text-[#3a362f]">{isStory ? "New story" : TYPE_LABEL[type]}</p>
          <p className="text-[13px] text-[#a39d92]">{isStory ? "Visible for 24 hours" : "It lands on Home right away"}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3.5">
        {needsMedia && (
          <MediaPicker
            accept={type === "photo" ? "image/*" : "video/*"}
            multiple={type === "photo" && !isStory}
            files={files}
            onChange={setFiles}
            kind={type === "photo" ? "photo" : "video"}
          />
        )}

        {type === "song" && <SongFields song={song} onChange={setSong} />}
        {type === "favorite" && <FavoriteFields favorite={favorite} onChange={setFavorite} files={files} onFiles={setFiles} />}
        {type === "activity" && !isStory && (
          <MediaPicker accept="image/*" files={files} onChange={setFiles} kind="photo" />
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          required={type === "text"}
          placeholder={
            type === "text"
              ? "What's on your mind?"
              : type === "activity"
                ? "What are you doing?"
                : "Caption (optional)"
          }
          rows={type === "text" ? 5 : 3}
          className={`${fieldClass()} resize-none ${type === "text" ? "text-[16px]" : ""}`}
        />

        {type === "activity" && !isStory && (
          <input
            placeholder="Where? (optional) — e.g. Nairobi"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className={fieldClass()}
          />
        )}

        {!isStory && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className={fieldClass()} />
              <input
                placeholder="Tags: trip, funny"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className={fieldClass()}
              />
            </div>
            {canOfferCollection && collections.length > 0 && (
              <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className={fieldClass()}>
                <option value="">Add to a collection (optional)</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? "Posting…" : isStory ? "Post story" : "Drop it"}
        </button>
      </form>
    </div>
  );
}

type SongState = { title: string; artist: string; album: string; url: string; artworkUrl: string; note: string };

function SongFields({ song, onChange }: { song: SongState; onChange: (s: SongState) => void }) {
  return (
    <div className="space-y-2.5 rounded-[22px] bg-[#f7f5f1] p-3.5">
      {(song.artworkUrl || song.title) && (
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3">
          {song.artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={song.artworkUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#e9e4da]">
              <Music2 size={20} className="text-[#7c766c]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-[#3a362f]">{song.title || "Song title"}</p>
            {song.artist && <p className="truncate text-[13px] text-[#7c766c]">{song.artist}</p>}
          </div>
          {song.url && (
            <a href={song.url} target="_blank" rel="noreferrer" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f2efe9] text-[#3a362f]">
              <ExternalLink size={15} />
            </a>
          )}
        </div>
      )}
      <input
        required
        placeholder="Song title"
        value={song.title}
        onChange={(e) => onChange({ ...song, title: e.target.value })}
        className={fieldClass()}
      />
      <input placeholder="Artist" value={song.artist} onChange={(e) => onChange({ ...song, artist: e.target.value })} className={fieldClass()} />
      <input placeholder="Album (optional)" value={song.album} onChange={(e) => onChange({ ...song, album: e.target.value })} className={fieldClass()} />
      <input
        placeholder="Spotify / Apple Music link (optional)"
        value={song.url}
        onChange={(e) => onChange({ ...song, url: e.target.value })}
        className={fieldClass()}
      />
      <input
        placeholder="Artwork URL (optional)"
        value={song.artworkUrl}
        onChange={(e) => onChange({ ...song, artworkUrl: e.target.value })}
        className={fieldClass()}
      />
      <textarea
        placeholder="A short note (optional)"
        rows={2}
        value={song.note}
        onChange={(e) => onChange({ ...song, note: e.target.value })}
        className={`${fieldClass()} resize-none`}
      />
    </div>
  );
}

type FavoriteState = { favoriteType: string; itemName: string; note: string };

function FavoriteFields({
  favorite,
  onChange,
  files,
  onFiles,
}: {
  favorite: FavoriteState;
  onChange: (f: FavoriteState) => void;
  files: File[];
  onFiles: (f: File[]) => void;
}) {
  return (
    <div className="space-y-2.5 rounded-[22px] bg-[#f7f5f1] p-3.5">
      <MediaPicker accept="image/*" files={files} onChange={onFiles} kind="photo" />
      <select
        value={favorite.favoriteType}
        onChange={(e) => onChange({ ...favorite, favoriteType: e.target.value })}
        className={fieldClass()}
      >
        {FAVORITE_KINDS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      <input
        required
        placeholder="What is it?"
        value={favorite.itemName}
        onChange={(e) => onChange({ ...favorite, itemName: e.target.value })}
        className={fieldClass()}
      />
      <textarea
        placeholder="Why it's a favorite (optional)"
        rows={2}
        value={favorite.note}
        onChange={(e) => onChange({ ...favorite, note: e.target.value })}
        className={`${fieldClass()} resize-none`}
      />
    </div>
  );
}
