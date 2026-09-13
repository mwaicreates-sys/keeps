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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1 rounded-full bg-[#f2efe9] px-3 py-1.5 text-[12.5px] font-semibold text-[#3a362f]"
      >
        <Plus size={13} /> New album
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex shrink-0 items-center gap-1.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Album name"
        className="w-28 rounded-full bg-[#f7f5f1] px-3 py-1.5 text-[12px] text-[#3a362f] outline-none placeholder:text-[#a39d92]"
      />
      <button
        type="submit"
        disabled={submitting}
        className="shrink-0 rounded-full bg-[#3a362f] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "…" : "Add"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="shrink-0 text-[12px] font-medium text-[#a39d92]">
        Cancel
      </button>
    </form>
  );
}
