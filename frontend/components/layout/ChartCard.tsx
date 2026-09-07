import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  description,
  children,
  className,
  delayMs = 0,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  return (
    <Card
      className={cn("animate-rise glass-card h-full overflow-hidden", className)}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg tracking-tight">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
