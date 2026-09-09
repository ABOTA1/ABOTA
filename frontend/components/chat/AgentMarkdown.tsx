"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface AgentMarkdownProps {
  content: string;
  className?: string;
}

function cellText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(cellText).join("");
  }
  return "";
}

function isNumericCell(children: ReactNode): boolean {
  const text = cellText(children).replace(/\s/g, "");
  return /^[-+$]?\d/.test(text) || text.includes("%") || /x$/i.test(text);
}

export function AgentMarkdown({ content, className }: AgentMarkdownProps) {
  return (
    <div className={cn("agent-report space-y-1 text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h3: ({ children }) => (
            <h3 className="mb-2 mt-5 font-display text-base font-semibold tracking-tight first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 text-[13px] leading-6 text-foreground/90 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          hr: () => <hr className="my-4 border-border/50" />,
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>,
          ol: ({ children }) => (
            <ol className="my-2 space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-[13px] leading-5">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-border/80 bg-background/60 shadow-sm">
              <table className="w-full min-w-[28rem] border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/80 text-[11px] uppercase tracking-wide text-muted-foreground">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th
              className={cn(
                "whitespace-nowrap border-b border-border px-3 py-2 font-semibold",
                isNumericCell(children) ? "text-right" : "text-left",
              )}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className={cn(
                "whitespace-nowrap border-b border-border/40 px-3 py-2 tabular-nums",
                isNumericCell(children) ? "text-right" : "text-left font-medium",
              )}
            >
              {children}
            </td>
          ),
          tbody: ({ children }) => <tbody className="[&>tr:first-child]:bg-primary/10 [&>tr:nth-child(even)]:bg-muted/30">{children}</tbody>,
          pre: ({ children }) => (
            <details className="my-3 rounded-xl border border-border/70 bg-background/70">
              <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                Trend data (JSON)
              </summary>
              <pre className="max-h-52 overflow-auto border-t border-border/60 p-3 text-[11px] leading-snug">
                {children}
              </pre>
            </details>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isBlock = Boolean(codeClassName);
            if (!isBlock) {
              return (
                <code className="rounded bg-background/80 px-1 py-0.5 text-[11px]" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={codeClassName} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
