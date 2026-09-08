"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useSidebarUi } from "@/components/layout/SidebarUi";

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/box-office": "Box office",
  "/trends": "Trends",
  "/agent": "Agent",
};

export function Header() {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useSidebarUi();
  const pageLabel = TITLES[pathname] ?? "ABOTA";

  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/55 px-3 backdrop-blur-xl sm:px-6">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </button>
      <div className="min-w-0">
        <p className="truncate font-display text-sm font-semibold tracking-tight">{pageLabel}</p>
        <p className="hidden text-[11px] text-muted-foreground sm:block">Box-office & trend analytics</p>
      </div>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Link
          href="/agent"
          className="text-xs font-medium text-primary transition-colors hover:text-primary/80 xl:hidden"
        >
          Agent
        </Link>
        <span className="hidden items-center gap-1.5 rounded-full border border-border/80 bg-background/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-flex">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-400" aria-hidden />
          Live Cloud
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
