"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/services/auth-client";
import { useToast } from "@/components/Toast";
import { getErrorMessage } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/");
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't sign in."), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-line bg-paper-raised p-6 shadow-sm">
      <h1 className="font-display text-xl">Welcome back</h1>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm text-ink-soft">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm text-ink-soft">Password</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-ink py-3 text-[15px] font-medium text-paper transition active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        New here? <Link href="/signup" className="font-medium text-accent">Create an account</Link>
      </p>
    </form>
  );
}
