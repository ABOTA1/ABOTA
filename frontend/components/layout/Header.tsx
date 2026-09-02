// components/layout/Header.tsx
import { Film } from "lucide-react";

export function Header() {
  return (
    <header className="h-14 border-b bg-card flex items-center px-6 gap-3 shrink-0">
      <Film className="w-5 h-5 text-primary" />
      <span className="font-semibold text-sm tracking-tight truncate">
        ABOTA{" "}
        <span className="hidden sm:inline font-normal text-muted-foreground">
          / Box-Office & Trend Analytics
        </span>
      </span>
      <div className="ml-auto flex items-center gap-3">
        <a
          href="#chat"
          className="text-xs text-primary hover:underline xl:hidden"
        >
          Agent
        </a>
        <span className="text-xs text-muted-foreground hidden sm:inline">Hackathon Demo</span>
      </div>
    </header>
  );
}
