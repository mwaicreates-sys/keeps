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
        className="rounded-full bg-white px-3.5 py-2 text-[13px] text-[#3a362f] outline-none"
      >
        <option value="">Add to…</option>
        {collections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button onClick={add} className="rounded-full bg-[#3a362f] px-3.5 py-2 text-[13px] font-medium text-white">
        Add
      </button>
      <input
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        placeholder="New album"
        className="rounded-full bg-white px-3.5 py-2 text-[13px] text-[#3a362f] outline-none placeholder:text-[#a39d92]"
      />
      <button onClick={createAndAdd} className="rounded-full bg-[#f2efe9] px-3.5 py-2 text-[13px] font-medium text-[#3a362f]">
        Create
      </button>
    </div>
  );
}
