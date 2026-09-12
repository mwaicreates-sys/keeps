"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/services/auth-client";
import { useToast } from "@/components/Toast";
import { getErrorMessage } from "@/lib/utils";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signUp(email, password, name);
      router.replace("/space/create");
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "Couldn't sign up."), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-line bg-paper-raised p-6 shadow-sm">
      <h1 className="font-display text-xl">Create your account</h1>
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm text-ink-soft">Your name</label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Gerry"
          className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
        />
      </div>
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
          minLength={6}
          autoComplete="new-password"
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
        {loading ? "Creating…" : "Create account"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        Already have an account? <Link href="/login" className="font-medium text-accent">Sign in</Link>
      </p>
    </form>
  );
}
