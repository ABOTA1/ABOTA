"use client";

import { useEffect, useState } from "react";
import { BarChart2, MessageSquare, Database, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebarUi } from "@/components/layout/SidebarUi";

const NAV = [
  { href: "/", hash: "", label: "Dashboard", icon: BarChart2 },
  { href: "/#charts", hash: "#charts", label: "Trends", icon: TrendingUp },
  { href: "/#chat", hash: "#chat", label: "Agent", icon: MessageSquare },
  { href: "/#data", hash: "#data", label: "Data", icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const { mobileOpen, closeMobile } = useSidebarUi();

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <aside
      className={cn(
        "border-r bg-sidebar text-sidebar-foreground flex flex-col py-4 gap-1 shrink-0 z-50",
        "fixed inset-y-0 left-0 w-64 transition-transform duration-200 ease-out md:static md:w-52 md:translate-x-0",
        mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full md:translate-x-0",
      )}
    >
      <div className="px-3 mb-4 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-sidebar-primary">
          ABOTA
        </span>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent md:hidden"
          aria-label="Close navigation"
          onClick={closeMobile}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {NAV.map(({ href, hash: itemHash, label, icon: Icon }) => {
        const active =
          pathname === "/" &&
          (itemHash ? hash === itemHash : hash === "" || hash === "#kpis");
        return (
          <Link
            key={href}
            href={href}
            onClick={() => {
              closeMobile();
              if (itemHash) {
                requestAnimationFrame(() => {
                  document.getElementById(itemHash.slice(1))?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                });
              } else {
                document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-colors duration-150",
              active
                ? "bg-sidebar-accent text-sidebar-primary font-medium"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
