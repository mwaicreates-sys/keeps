"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Link as LinkIcon, MapPin, Camera, Pencil } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { createDrop, type DropType } from "@/services/posts-client";
import { createStory } from "@/services/stories-client";
import { fetchLinkPreview, type LinkPreview } from "@/services/link-preview-client";
import { getErrorMessage } from "@/lib/utils";
import { MediaPicker } from "@/components/drop/MediaPicker";
import { LinkPreviewCard } from "@/components/drop/LinkPreviewCard";

const TYPE_LABEL: Record<DropType, string> = {
  photo: "Photo",
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

const ACTIVITY_SUGGESTIONS = ["Dinner", "Gym", "Movie", "Road trip", "Coffee", "Beach", "Shopping", "Walk"];

// A favorite is never made to pick a category (per the redesign) -- every
// Favorite Drop gets this one fixed value rather than asking.
const GENERIC_FAVORITE_TYPE = "Other";

function fieldClass() {
  return "w-full rounded-2xl bg-[#f7f5f1] px-4 py-3 text-[15px] text-[#3a362f] outline-none placeholder:text-[#a39d92] focus:bg-[#f2efe9]";
}

/**
 * Debounced link-preview resolution shared by Music (its one required
 * input) and Favorite (an optional one). Paste or type a URL and it
 * quietly resolves in the background 500ms after the last keystroke --
 * nothing changes on screen until it either succeeds (the caller swaps
 * in the polished LinkPreviewCard) or fails (the caller shows its own
 * "couldn't recognize that" fallback). The raw URL never has to stay on
 * screen once a preview exists.
 */
function useLinkPreview() {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onUrlChange(value: string) {
    setUrl(value);
    setPreview(null);
    setFailed(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const trimmed = value.trim();
    if (!/^https?:\/\//i.test(trimmed)) return;
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      const result = await fetchLinkPreview(trimmed);
      setLoading(false);
      if (result) setPreview(result);
      else setFailed(true);
    }, 500);
  }

  return { url, preview, loading, failed, onUrlChange };
}

/**
 * The composer that opens once a Drop type is chosen -- one shared shape
 * for every type: select content, an optional caption, then Drop. No
 * title/category/date/location fields to fill in; today's date is saved
 * automatically, and Music/Favorite links are read automatically instead
 * of asked for by hand.
 */
export function DropComposer({
  type,
  isStory,
  initialCaption,
  onClose,
}: {
  type: DropType;
  isStory: boolean;
  /** Prefills the caption/text field -- used when the quick-capture bar on
   * the Drop landing page already collected what to say before a type
   * (text) was even chosen. */
  initialCaption?: string;
  onClose: () => void;
}) {
  const { userId, space, otherMember } = useSession();
  const { show } = useToast();
  const router = useRouter();

  const [caption, setCaption] = useState(initialCaption ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Activity
  const [place, setPlace] = useState("");
  const [showPlaceInput, setShowPlaceInput] = useState(false);
  const [showActivityPhoto, setShowActivityPhoto] = useState(false);

  // Music
  const song = useLinkPreview();
  const [songEditing, setSongEditing] = useState(false);
  const [manualSong, setManualSong] = useState({ title: "", artist: "", artworkUrl: "" });

  // Favorite
  const favLink = useLinkPreview();
  const [favShortName, setFavShortName] = useState("");
  const [favMode, setFavMode] = useState<"photo" | "link" | null>(null);

  const needsMedia = type === "photo" || type === "video";
  // Text and Activity's own primary field already IS the caption -- no
  // second "Add a caption" box beneath it, unlike every other type.
  const hasOwnCaptionField = type === "text" || type === "activity";

  function songPayload() {
    if (songEditing || !song.preview) {
      return {
        title: manualSong.title,
        artist: manualSong.artist || undefined,
        artworkUrl: manualSong.artworkUrl || undefined,
        url: song.url || undefined,
      };
    }
    return {
      title: song.preview.title,
      artist: song.preview.subtitle || undefined,
      artworkUrl: song.preview.artworkUrl || undefined,
      url: song.preview.url,
    };
  }

  function favoritePayload() {
    const itemName = favShortName.trim() || favLink.preview?.title || "A favorite";
    return { favoriteType: GENERIC_FAVORITE_TYPE, itemName };
  }

  const canSubmit = (() => {
    if (needsMedia) return files.length > 0;
    if (type === "text" || type === "activity") return caption.trim().length > 0;
    if (type === "song") return songEditing ? manualSong.title.trim().length > 0 : !!song.preview;
    if (type === "favorite") return favShortName.trim().length > 0 || !!favLink.preview || files.length > 0;
    return true;
  })();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
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
          song: type === "song" ? songPayload() : undefined,
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
          occurredAt: new Date().toISOString(),
          mediaFiles: files.length ? files : undefined,
          song: type === "song" ? songPayload() : undefined,
          favorite: type === "favorite" ? favoritePayload() : undefined,
        });
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
    <div className="mx-auto flex min-h-[calc(100dvh-1px)] max-w-xl flex-col px-4 pt-1">
      <div className="mb-4 flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#3a362f] shadow-sm"
        >
          <X size={20} />
        </button>
        <p className="text-[19px] font-bold text-[#3a362f]">{isStory ? "New story" : TYPE_LABEL[type]}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-1 flex-col pb-4">
        <div className="flex-1 space-y-3.5">
          {needsMedia && (
            <MediaPicker
              accept={type === "photo" ? "image/*" : "video/*"}
              multiple={type === "photo" && !isStory}
              files={files}
              onChange={setFiles}
              kind={type === "photo" ? "photo" : "video"}
            />
          )}

          {type === "text" && (
            <textarea
              autoFocus
              required
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's on your mind?"
              rows={7}
              className={`${fieldClass()} resize-none text-[17px] leading-relaxed`}
            />
          )}

          {type === "song" &&
            (songEditing ? (
              <div className="space-y-2.5 rounded-[22px] bg-[#f7f5f1] p-3.5">
                <input
                  autoFocus
                  required
                  placeholder="Song title"
                  value={manualSong.title}
                  onChange={(e) => setManualSong((s) => ({ ...s, title: e.target.value }))}
                  className={fieldClass()}
                />
                <input
                  placeholder="Artist (optional)"
                  value={manualSong.artist}
                  onChange={(e) => setManualSong((s) => ({ ...s, artist: e.target.value }))}
                  className={fieldClass()}
                />
                <input
                  placeholder="Artwork URL (optional)"
                  value={manualSong.artworkUrl}
                  onChange={(e) => setManualSong((s) => ({ ...s, artworkUrl: e.target.value }))}
                  className={fieldClass()}
                />
              </div>
            ) : song.preview ? (
              <div className="space-y-2">
                <LinkPreviewCard preview={song.preview} />
                <button
                  type="button"
                  onClick={() => setSongEditing(true)}
                  className="flex items-center gap-1 text-[12.5px] font-medium text-[#a39d92]"
                >
                  <Pencil size={12} /> Edit details
                </button>
              </div>
            ) : (
              <div>
                <label className="flex items-center gap-2.5 rounded-[22px] bg-[#f7f5f1] px-4 py-3.5">
                  <LinkIcon size={18} className="shrink-0 text-[#a39d92]" />
                  <input
                    autoFocus
                    value={song.url}
                    onChange={(e) => song.onUrlChange(e.target.value)}
                    placeholder="Paste a Spotify, Apple Music, YouTube or SoundCloud link"
                    inputMode="url"
                    className="min-w-0 flex-1 bg-transparent text-[14.5px] text-[#3a362f] outline-none placeholder:text-[#a39d92]"
                  />
                </label>
                {song.loading && <p className="mt-2 px-1 text-[12px] text-[#a39d92]">Looking that up…</p>}
                {song.failed && (
                  <p className="mt-2 px-1 text-[12px] text-[#c23a3a]">
                    Couldn&apos;t recognize that link.{" "}
                    <button type="button" onClick={() => setSongEditing(true)} className="font-semibold underline">
                      Enter details manually
                    </button>
                  </p>
                )}
              </div>
            ))}

          {type === "activity" && (
            <div className="space-y-3">
              <textarea
                autoFocus
                required
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What are you doing?"
                rows={2}
                className={`${fieldClass()} resize-none text-[16px]`}
              />

              {caption.trim().length === 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ACTIVITY_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCaption(s)}
                      className="rounded-full bg-[#f2efe9] px-3 py-1.5 text-[12.5px] font-medium text-[#5c574c]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {place || showPlaceInput ? (
                  <div className="flex items-center gap-1.5 rounded-full bg-[#e5eef6] py-1.5 pl-3 pr-1.5">
                    <MapPin size={13} className="shrink-0 text-[#2f6fa3]" />
                    <input
                      autoFocus={showPlaceInput && !place}
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      placeholder="Where?"
                      className="w-28 bg-transparent text-[12.5px] font-medium text-[#2f6fa3] outline-none placeholder:text-[#7fa3c2]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPlace("");
                        setShowPlaceInput(false);
                      }}
                      aria-label="Remove place"
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[#2f6fa3]"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPlaceInput(true)}
                    className="flex items-center gap-1 rounded-full bg-[#f2efe9] px-3 py-1.5 text-[12.5px] font-medium text-[#5c574c]"
                  >
                    <MapPin size={13} /> Add place
                  </button>
                )}

                {!showActivityPhoto && files.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowActivityPhoto(true)}
                    className="flex items-center gap-1 rounded-full bg-[#f2efe9] px-3 py-1.5 text-[12.5px] font-medium text-[#5c574c]"
                  >
                    <Camera size={13} /> Add photo
                  </button>
                )}
              </div>

              {(showActivityPhoto || files.length > 0) && (
                <MediaPicker accept="image/*" files={files} onChange={setFiles} kind="photo" />
              )}
            </div>
          )}

          {type === "favorite" && (
            <div className="space-y-3">
              <input
                autoFocus
                value={favShortName}
                onChange={(e) => setFavShortName(e.target.value)}
                placeholder="What are you loving?"
                className={fieldClass()}
              />

              {favMode === null && files.length === 0 && !favLink.url && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFavMode("photo")}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#f2efe9] py-2.5 text-[13px] font-semibold text-[#3a362f]"
                  >
                    <Camera size={15} /> Add photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setFavMode("link")}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#f2efe9] py-2.5 text-[13px] font-semibold text-[#3a362f]"
                  >
                    <LinkIcon size={15} /> Paste link
                  </button>
                </div>
              )}

              {favMode === "photo" && <MediaPicker accept="image/*" files={files} onChange={setFiles} kind="photo" />}

              {favMode === "link" &&
                (favLink.preview ? (
                  <LinkPreviewCard preview={favLink.preview} />
                ) : (
                  <div>
                    <label className="flex items-center gap-2.5 rounded-[22px] bg-[#f7f5f1] px-4 py-3.5">
                      <LinkIcon size={18} className="shrink-0 text-[#a39d92]" />
                      <input
                        autoFocus
                        value={favLink.url}
                        onChange={(e) => favLink.onUrlChange(e.target.value)}
                        placeholder="Paste a link"
                        inputMode="url"
                        className="min-w-0 flex-1 bg-transparent text-[14.5px] text-[#3a362f] outline-none placeholder:text-[#a39d92]"
                      />
                    </label>
                    {favLink.loading && <p className="mt-2 px-1 text-[12px] text-[#a39d92]">Looking that up…</p>}
                    {favLink.failed && (
                      <p className="mt-2 px-1 text-[12px] text-[#a39d92]">
                        Couldn&apos;t find a preview for that link — that&apos;s okay, what you typed above is enough.
                      </p>
                    )}
                  </div>
                ))}
            </div>
          )}

          {!hasOwnCaptionField && (
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption…"
              rows={2}
              className={`${fieldClass()} resize-none`}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="sticky bottom-3 mt-4 w-full shrink-0 rounded-full bg-[#3a362f] py-3.5 text-[15.5px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(20,18,15,0.35)] transition active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? "Dropping…" : isStory ? "Post story" : "Drop"}
        </button>
      </form>
    </div>
  );
}
