"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface AgentMarkdownProps {
  content: string;
  className?: string;
}

export function AgentMarkdown({ content, className }: AgentMarkdownProps) {
  return (
    <div className={cn("agent-markdown text-sm leading-relaxed", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 font-display text-sm font-semibold first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          hr: () => <hr className="my-3 border-border/70" />,
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>,
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1.5 pl-4">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          table: ({ children }) => (
            <div className="my-3 max-h-64 overflow-auto rounded-xl border border-border/70">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-background/60">{children}</thead>,
          th: ({ children }) => (
            <th className="whitespace-nowrap border-b border-border px-2 py-1.5 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="whitespace-nowrap border-b border-border/40 px-2 py-1.5">{children}</td>
          ),
          pre: ({ children }) => (
            <pre className="my-2 max-h-48 overflow-auto rounded-xl bg-background/80 p-3 text-[11px] leading-snug">
              {children}
            </pre>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isBlock = Boolean(codeClassName);
            if (!isBlock) {
              return (
                <code
                  className="rounded bg-background/80 px-1 py-0.5 text-[11px]"
                  {...props}
                >
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
