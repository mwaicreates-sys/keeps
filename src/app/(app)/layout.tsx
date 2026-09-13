import { redirect } from "next/navigation";
import Link from "next/link";
import { Search, Bell } from "lucide-react";
import { getSessionContext } from "@/services/session";
import { BottomNav } from "@/components/BottomNav";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { TopBar } from "@/components/TopBar";
import { HideOnHome } from "@/components/HideOnHome";
import { MainSurface } from "@/components/MainSurface";
import { AppThemeShell } from "@/components/AppThemeShell";
import { SessionProvider } from "@/components/SessionProvider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/space/create");

  return (
    <SessionProvider value={ctx}>
      <AppThemeShell>
        <DesktopSidebar />
        <div className="flex min-h-[100vh] flex-1 flex-col">
          <HideOnHome>
            <TopBar userId={ctx.userId} />
          </HideOnHome>
          <div className="hidden items-center justify-end gap-1 border-b border-line px-6 py-3 md:flex">
            <Link href="/search" aria-label="Search" className="rounded-full p-2 text-ink hover:bg-accent-soft">
              <Search size={19} strokeWidth={1.8} />
            </Link>
            <Link href="/notifications" aria-label="Notifications" className="rounded-full p-2 text-ink hover:bg-accent-soft">
              <Bell size={19} strokeWidth={1.8} />
            </Link>
          </div>
          <MainSurface>{children}</MainSurface>
        </div>
      </AppThemeShell>
      <BottomNav />
    </SessionProvider>
  );
}
