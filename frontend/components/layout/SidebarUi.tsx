"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface SidebarUiContextValue {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  closeMobile: () => void;
}

const SidebarUiContext = createContext<SidebarUiContextValue | null>(null);

export function SidebarUiProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, closeMobile]);

  const value = useMemo(
    () => ({ mobileOpen, setMobileOpen, closeMobile }),
    [mobileOpen, closeMobile],
  );

  return <SidebarUiContext.Provider value={value}>{children}</SidebarUiContext.Provider>;
}

export function useSidebarUi() {
  const ctx = useContext(SidebarUiContext);
  if (!ctx) throw new Error("useSidebarUi must be used within SidebarUiProvider");
  return ctx;
}
