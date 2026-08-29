// components/layout/Sidebar.tsx
"use client";

import { BarChart2, MessageSquare, Database, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: BarChart2 },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/chat", label: "Agent", icon: MessageSquare },
  { href: "/data", label: "Data", icon: Database },
  // TODO: Add more nav items as you build out pages
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-14 md:w-52 border-r bg-card flex flex-col py-4 gap-1 shrink-0">
      {/* Logo */}
      <div className="px-3 mb-4 hidden md:block">
        <span className="text-xs font-bold uppercase tracking-widest text-primary">ABOTA</span>
      </div>

      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-colors",
            pathname === href
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="hidden md:block">{label}</span>
        </Link>
      ))}
    </aside>
  );
}
