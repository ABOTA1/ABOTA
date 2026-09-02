// components/layout/Sidebar.tsx
"use client";

import { useEffect, useState } from "react";
import { BarChart2, MessageSquare, Database, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", hash: "", label: "Dashboard", icon: BarChart2 },
  { href: "/#charts", hash: "#charts", label: "Trends", icon: TrendingUp },
  { href: "/#chat", hash: "#chat", label: "Agent", icon: MessageSquare },
  { href: "/#data", hash: "#data", label: "Data", icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <aside className="w-14 md:w-52 border-r bg-card flex flex-col py-4 gap-1 shrink-0">
      {/* Logo */}
      <div className="px-3 mb-4 hidden md:block">
        <span className="text-xs font-bold uppercase tracking-widest text-primary">ABOTA</span>
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
              if (itemHash) {
                requestAnimationFrame(() => {
                  document.getElementById(itemHash.slice(1))?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                });
              } else {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-colors",
              active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="hidden md:block">{label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
