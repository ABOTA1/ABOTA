"use client";

import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarUiProvider, useSidebarUi } from "@/components/layout/SidebarUi";

function ShellFrame({ children }: { children: ReactNode }) {
  const { mobileOpen, closeMobile } = useSidebarUi();

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[1px] md:hidden animate-in fade-in-0 duration-200"
          onClick={closeMobile}
        />
      ) : null}
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarUiProvider>
      <ShellFrame>{children}</ShellFrame>
    </SidebarUiProvider>
  );
}
