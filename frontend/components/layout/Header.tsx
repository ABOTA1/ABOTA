"use client";

import { Film, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useSidebarUi } from "@/components/layout/SidebarUi";

export function Header() {
  const { mobileOpen, setMobileOpen } = useSidebarUi();

  return (
    <header className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center px-3 sm:px-6 gap-3 shrink-0">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </button>
      <Film className="w-5 h-5 text-primary shrink-0" />
      <span className="font-semibold text-sm tracking-tight truncate">
        ABOTA{" "}
        <span className="hidden sm:inline font-normal text-muted-foreground">
          / Box-Office & Trend Analytics
        </span>
      </span>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <a
          href="#chat"
          className="text-xs text-primary transition-colors hover:underline xl:hidden"
        >
          Agent
        </a>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          Live Cloud
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
