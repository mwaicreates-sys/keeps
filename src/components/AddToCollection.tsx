"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCollection, createCollection } from "@/services/collections-client";

export function AddToCollection({
  postId,
  collections,
  spaceId,
  userId,
}: {
  postId: string;
  collections: { id: string; name: string }[];
  spaceId: string;
  userId: string;
}) {
  const [selected, setSelected] = useState("");
  const [newName, setNewName] = useState("");
  const router = useRouter();

  async function add() {
    if (!selected) return;
    await addToCollection(selected, postId);
    router.refresh();
  }

  async function createAndAdd() {
    if (!newName.trim()) return;
    const c = await createCollection(spaceId, userId, newName.trim());
    await addToCollection(c.id, postId);
    setNewName("");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs"
      >
        <option value="">Add to…</option>
        {collections.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <button onClick={add} className="rounded-full bg-ink px-3 py-1.5 text-xs text-paper">Add</button>
      <input
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        placeholder="New collection"
        className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs"
      />
      <button onClick={createAndAdd} className="rounded-full border border-line px-3 py-1.5 text-xs">Create</button>
    </div>
  );
}
