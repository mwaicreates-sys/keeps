"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, LogIn, ChevronDown } from "lucide-react";
import { signOut, joinSpace } from "@/services/auth-client";
import { useToast } from "@/components/Toast";
import { getErrorMessage } from "@/lib/utils";

/**
 * Account/space switching, reachable from mobile Profile (previously the
 * only sign-out control lived in the desktop-only sidebar, so there was no
 * way to log out or switch spaces from a phone).
 *
 * "Join a space" here calls the same invite-code join used during
 * onboarding — it adds this account to another space. Note a space is
 * capped at 2 members by design (Keeps is a two-person app), so an invite
 * code for a space that already has two members (like the demo space)
 * will be rejected. To use a demo account, sign out and sign back in with
 * its own email/password instead of trying to join its space.
 */
export function AccountSwitcher() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    try {
      await joinSpace(code);
      show("You're in.");
      router.replace("/home");
      router.refresh();
    } catch (err) {
      show(getErrorMessage(err, "That invite code didn't work."), "error");
    } finally {
      setJoining(false);
    }
  }

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-line">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink"
      >
        Switch account or space
        <ChevronDown size={16} className={`text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-4 py-3">
          <form onSubmit={onJoin} className="flex gap-2">
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Invite code"
              maxLength={6}
              className="min-w-0 flex-1 rounded-full border border-line bg-paper-raised px-3 py-2 text-center text-sm font-medium tracking-[0.2em] text-ink outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={joining}
              className="flex items-center gap-1 rounded-full bg-ink px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              <LogIn size={13} /> {joining ? "Joining…" : "Join"}
            </button>
          </form>
          <p className="text-xs text-ink-soft">
            A space only holds 2 people — an invite code for a space that already has both members
            (like the Keeps Demo space) can&apos;t be joined. Sign out and sign back in with that
            account&apos;s own email instead.
          </p>
          <button
            onClick={onSignOut}
            disabled={signingOut}
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-line py-2 text-sm font-medium text-ink-soft disabled:opacity-50"
          >
            <LogOut size={14} /> {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
