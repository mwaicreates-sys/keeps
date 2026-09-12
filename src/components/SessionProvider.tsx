"use client";

import { createContext, useContext } from "react";
import type { SessionContext as SessionContextType } from "@/services/session";

const Ctx = createContext<SessionContextType | null>(null);

export function SessionProvider({
  value,
  children,
}: {
  value: SessionContextType;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
