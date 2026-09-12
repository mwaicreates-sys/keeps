"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { joinSpace } from "@/services/auth-client";
import { useToast } from "@/components/Toast";
import { getErrorMessage } from "@/lib/utils";

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
      show(getErrorMessage(err, "That invite code didn't work."), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur"
    >
      <h1 className="font-chunky text-2xl font-extrabold text-white">Join a space</h1>
      <p className="text-sm text-white/60">Enter the invite code you were sent.</p>
      <input
        required
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABC123"
        maxLength={6}
        className="font-chunky w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-center text-lg font-bold tracking-[0.3em] text-white outline-none placeholder:text-white/20 focus:border-[#4ade80]"
      />
      <button
        type="submit"
        disabled={loading}
        className="font-chunky w-full rounded-full bg-[#4ade80] py-3.5 text-[15px] font-bold text-[#0b0b0d] transition active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Joining…" : "Join space"}
      </button>
      <p className="text-center text-sm text-white/50">
        Starting fresh?{" "}
        <Link href="/space/create" className="font-semibold text-[#4ade80]">
          Create a space
        </Link>
      </p>
    </form>
  );
}
