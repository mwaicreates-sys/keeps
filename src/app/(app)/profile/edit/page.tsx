"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/Toast";
import { Avatar } from "@/components/Avatar";
import { updateProfile, uploadAvatar } from "@/services/profile-client";
import { getErrorMessage } from "@/lib/utils";

export default function EditProfilePage() {
  const { userId, space, profile } = useSession();
  const { show } = useToast();
  const router = useRouter();
  const fileId = useId();

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [interests, setInterests] = useState(profile.interests.join(", "));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url ?? null);
  const [submitting, setSubmitting] = useState(false);

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let avatarUrl = profile.avatar_url ?? undefined;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(space.id, userId, avatarFile);
      }
      await updateProfile(userId, {
        display_name: displayName.trim() || profile.display_name,
        handle: handle.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || profile.handle,
        bio: bio.trim() || undefined,
        interests: interests
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
        avatar_url: avatarUrl,
      });
      show("Profile updated.");
      router.push("/profile");
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't save your profile — that handle might already be taken."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/profile"
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-display text-2xl">Edit profile</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex justify-center">
          <label htmlFor={fileId} className="relative cursor-pointer">
            <Avatar name={displayName || profile.display_name} url={avatarPreview} size={96} shape="square" />
            <span className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-ink text-paper shadow-md">
              <Camera size={14} />
            </span>
            <input id={fileId} type="file" accept="image/*" onChange={onPickAvatar} className="sr-only" />
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-ink-soft">Display name</label>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-ink-soft">Handle</label>
          <div className="flex items-center gap-1 rounded-xl border border-line bg-paper px-3.5 py-2.5 focus-within:border-accent">
            <span className="text-sm text-ink-soft">@</span>
            <input
              required
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-ink-soft">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="A line or two about you"
            className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-ink-soft">Interests</label>
          <input
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="Arsenal, Kendrick, Chess, Design"
            className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
          <p className="mt-1 text-xs text-ink-soft">Comma-separated.</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-ink py-3.5 text-[15px] font-medium text-paper transition active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
