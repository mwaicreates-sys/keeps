import { Sparkles } from "lucide-react";

/**
 * The splash screen — Next.js shows this automatically for whatever
 * moment the root route (`page.tsx`) spends resolving the session/auth
 * check before it redirects to /login or /home. That's exactly the
 * real-world window this needs to cover: a cold PWA launch doing its
 * first network round trip. Same mark, same colors as HomeHeader — not
 * a new design, the existing one, centered full-screen.
 */
export default function RootLoading() {
  return (
    <div className="flex min-h-[100vh] flex-col items-center justify-center gap-3 bg-paper px-6 text-center">
      <Sparkles size={40} className="animate-pulse text-[#c2ab5a] motion-reduce:animate-none" strokeWidth={1.8} />
      <p className="text-[30px] font-bold tracking-tight text-ink">keeps</p>
      <p className="text-[14.5px] text-ink-soft">A private space for two.</p>
    </div>
  );
}
