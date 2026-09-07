"use client";

import { BarChart2, MessageSquare, Clapperboard, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebarUi } from "@/components/layout/SidebarUi";

const NAV = [
  { href: "/", label: "Overview", icon: BarChart2 },
  { href: "/box-office", label: "Box office", icon: Clapperboard },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/agent", label: "Agent", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const { mobileOpen, closeMobile } = useSidebarUi();

  return (
    <aside
      className={cn(
        "relative z-50 flex shrink-0 flex-col gap-1 border-r border-sidebar-border bg-sidebar/80 py-5 text-sidebar-foreground backdrop-blur-xl",
        "fixed inset-y-0 left-0 w-64 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:static md:w-56 md:translate-x-0",
        mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0",
      )}
    >
      <div className="mb-6 flex items-center justify-between px-4">
        <Link href="/" onClick={closeMobile} className="group">
          <span className="block font-display text-lg font-semibold tracking-tight">
            <span className="bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent">
              ABOTA
            </span>
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Studio
          </span>
        </Link>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent md:hidden"
          aria-label="Close navigation"
          onClick={closeMobile}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={closeMobile}
              className={cn(
                "relative mx-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-glow"
                  : "text-muted-foreground hover:translate-x-0.5 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                />
              ) : null}
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
