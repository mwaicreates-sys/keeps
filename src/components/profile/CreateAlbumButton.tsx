"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createCollection } from "@/services/collections-client";
import { useToast } from "@/components/Toast";
import { getErrorMessage } from "@/lib/utils";

export function CreateAlbumButton({ spaceId, userId }: { spaceId: string; userId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { show } = useToast();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createCollection(spaceId, userId, name.trim());
      setName("");
      setOpen(false);
      show("Album created.");
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't create that album."), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-sm font-medium text-accent">
        <Plus size={15} /> Create album
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Album name"
        className="w-32 rounded-full border border-line bg-paper px-3 py-1.5 text-xs outline-none focus:border-accent"
      />
      <button type="submit" disabled={submitting} className="rounded-full bg-ink px-3 py-1.5 text-xs text-paper disabled:opacity-50">
        {submitting ? "…" : "Add"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-ink-soft">
        Cancel
      </button>
    </form>
  );
}
