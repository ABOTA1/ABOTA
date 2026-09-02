"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-4 py-8 text-center",
        className,
      )}
    >
      <Icon className="h-8 w-8 text-muted-foreground/70" aria-hidden />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}
