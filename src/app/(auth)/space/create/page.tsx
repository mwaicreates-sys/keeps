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
      <div className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.06] p-6 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur">
        <h1 className="font-chunky text-2xl font-extrabold text-white">Your space is ready</h1>
        <p className="text-sm text-white/60">Send this code to the one person who joins you here.</p>
        <p className="font-chunky rounded-2xl border border-dashed border-[#4ade80]/40 bg-[#4ade80]/10 py-4 text-3xl font-extrabold tracking-[0.3em] text-[#4ade80]">
          {inviteCode}
        </p>
        <button
          onClick={() => router.replace("/home")}
          className="font-chunky w-full rounded-full bg-[#4ade80] py-3.5 text-[15px] font-bold text-[#0b0b0d] active:scale-[0.98]"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur"
    >
      <h1 className="font-chunky text-2xl font-extrabold text-white">Start your space</h1>
      <p className="text-sm text-white/60">Give it a name only the two of you will see.</p>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Gerry & Cuz"
        className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-[#4ade80]"
      />
      <button
        type="submit"
        disabled={loading}
        className="font-chunky w-full rounded-full bg-[#4ade80] py-3.5 text-[15px] font-bold text-[#0b0b0d] transition active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create space"}
      </button>
      <p className="text-center text-sm text-white/50">
        Got an invite code?{" "}
        <Link href="/space/join" className="font-semibold text-[#4ade80]">
          Join a space
        </Link>
      </p>
    </form>
  );
}
