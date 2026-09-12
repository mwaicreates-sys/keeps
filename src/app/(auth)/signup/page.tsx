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
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur"
    >
      <h1 className="font-chunky text-2xl font-extrabold text-white">Create your account</h1>
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-white/60">
          Your name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Gerry"
          className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-[#4ade80]"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-white/60">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-[#4ade80]"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-white/60">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-[#4ade80]"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="font-chunky w-full rounded-full bg-[#4ade80] py-3.5 text-[15px] font-bold text-[#0b0b0d] transition active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create account"}
      </button>
      <p className="text-center text-sm text-white/50">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#4ade80]">
          Sign in
        </Link>
      </p>
    </form>
  );
}
