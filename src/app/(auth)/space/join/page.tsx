"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { joinSpace } from "@/services/auth-client";
import { useToast } from "@/components/Toast";

export default function JoinSpacePage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await joinSpace(code);
      show("You're in.");
      router.replace("/home");
      router.refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "That invite code didn't work.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-line bg-paper-raised p-6 shadow-sm">
      <h1 className="font-display text-xl">Join a space</h1>
      <p className="text-sm text-ink-soft">Enter the invite code you were sent.</p>
      <input
        required
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABC123"
        maxLength={6}
        className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-center font-display text-lg tracking-[0.3em] outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-ink py-3 text-[15px] font-medium text-paper transition active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Joining…" : "Join space"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        Starting fresh? <Link href="/space/create" className="font-medium text-accent">Create a space</Link>
      </p>
    </form>
  );
}
