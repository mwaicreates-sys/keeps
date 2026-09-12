"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSpace } from "@/services/auth-client";
import { useToast } from "@/components/Toast";
import { getErrorMessage } from "@/lib/utils";

export default function CreateSpacePage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const router = useRouter();
  const { show } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const space = await createSpace(name);
      setInviteCode(space.invite_code);
    } catch (err) {
      show(getErrorMessage(err, "Couldn't create your space."), "error");
    } finally {
      setLoading(false);
    }
  }

  if (inviteCode) {
    return (
      <div className="space-y-5 rounded-3xl border border-line bg-paper-raised p-6 text-center shadow-sm">
        <h1 className="font-display text-xl">Your space is ready</h1>
        <p className="text-sm text-ink-soft">Send this code to the one person who joins you here.</p>
        <p className="rounded-2xl border border-dashed border-accent/40 bg-accent-soft py-4 font-display text-3xl tracking-[0.3em] text-accent">
          {inviteCode}
        </p>
        <button
          onClick={() => router.replace("/home")}
          className="w-full rounded-full bg-ink py-3 text-[15px] font-medium text-paper active:scale-[0.98]"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-line bg-paper-raised p-6 shadow-sm">
      <h1 className="font-display text-xl">Start your space</h1>
      <p className="text-sm text-ink-soft">Give it a name only the two of you will see.</p>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Gerry & Cuz"
        className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-ink py-3 text-[15px] font-medium text-paper transition active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create space"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        Got an invite code? <Link href="/space/join" className="font-medium text-accent">Join a space</Link>
      </p>
    </form>
  );
}
