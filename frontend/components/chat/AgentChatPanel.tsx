"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, RefreshCw, AlertTriangle, Database, Cpu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { askAgent } from "@/lib/api";
import { MiniChart } from "@/components/chat/MiniChart";
import type { AnalyticsResult, ChatResponse } from "@/types/analytics";

// ── Issue #6: error classification ──────────────────────────────────────────

type ErrorKind = "db" | "gemini" | "timeout" | "network" | "unknown";

function classifyError(err: unknown, responseError?: string): ErrorKind {
  const msg = [
    err instanceof Error ? err.message : String(err),
    responseError ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (err instanceof Error && err.name === "AbortError") return "timeout";
  if (msg.includes("networkerror") || msg.includes("failed to fetch")) return "network";
  if (msg.includes("clickhouse") || msg.includes("sql") || msg.includes("query") || msg.includes("database"))
    return "db";
  if (msg.includes("gemini") || msg.includes("quota") || msg.includes("generative"))
    return "gemini";
  return "unknown";
}

const ERROR_META: Record<ErrorKind, { icon: React.ElementType; label: string; color: string }> = {
  timeout:  { icon: Loader2,        label: "Request timed out after 60 s.",          color: "text-yellow-400" },
  network:  { icon: AlertTriangle,  label: "Network error — check your connection.",  color: "text-red-400"    },
  db:       { icon: Database,       label: "Database error (ClickHouse / SQL).",      color: "text-orange-400" },
  gemini:   { icon: Cpu,            label: "Gemini API error or quota exceeded.",     color: "text-purple-400" },
  unknown:  { icon: AlertTriangle,  label: "Unexpected error.",                       color: "text-red-400"    },
};

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "agent";
  text: string;
  analytics?: AnalyticsResult;
  error?: string;
  errorKind?: ErrorKind;   // Issue #6
}

interface AgentChatPanelProps {
  onAnalytics?: (analytics: AnalyticsResult | null) => void;
  className?: string;
}

const SUGGESTIONS = [
  "Which 5 movies have the highest total box office?",
  "Show the weekly social mentions trend",
  "Compare revenue share by platform",
  "Which genre has the strongest revenue versus budget?",
];

const CLIENT_TIMEOUT_MS = 60_000; // Issue #6

// ── Component ────────────────────────────────────────────────────────────────

export function AgentChatPanel({ onAnalytics, className }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);

    // Issue #6: 30-second AbortController timeout
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const res: ChatResponse = await askAgent(question, controller.signal);
      clearTimeout(timeoutId);

      // Issue #6: classify backend-reported error even on 200 responses
      const errorKind = res.error ? classifyError(undefined, res.error) : undefined;

      setMessages((prev) => [
        ...prev,
        {
          role:      "agent",
          text:      res.answer,
          analytics: res.analytics ?? undefined,
          error:     res.error     ?? undefined,
          errorKind,
        },
      ]);
      if (res.analytics) onAnalytics?.(res.analytics);
    } catch (err) {
      clearTimeout(timeoutId);
      const errorKind = classifyError(err);
      const meta      = ERROR_META[errorKind];
      setMessages((prev) => [
        ...prev,
        {
          role:      "agent",
          text:      meta.label,
          error:     err instanceof Error ? err.message : String(err),
          errorKind,
          // Issue #6: attach the original question so the retry button can replay it
          analytics: undefined,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "glass-card flex min-h-[24rem] flex-col overflow-hidden rounded-2xl shadow-glow",
        className,
      )}
    >
      {/* Header — unchanged */}
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Bot className="h-4 w-4" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold leading-none">ABOTA Agent</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Gemini (quota fallback) · ClickHouse Cloud</p>
        </div>
        <Sparkles className="ml-auto h-4 w-4 text-chart-3" />
      </div>

      {/* Message list */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="mt-6 flex flex-col items-center gap-3 px-2">
            <p className="text-center font-display text-sm font-medium">Ask a business question</p>
            <p className="max-w-sm text-center text-xs text-muted-foreground">
              Ranking, trends, platform mix, or crossed metrics. The chart beside this panel updates when results arrive.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-border/80 bg-background/40 px-3 py-1.5 text-xs transition-all duration-200 hover:border-primary/50 hover:bg-primary/10 hover:text-foreground active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          // Issue #6: find the user question that triggered a failed agent response
          const prevUserText = msg.role === "agent" && msg.errorKind
            ? messages.slice(0, i).findLast((m) => m.role === "user")?.text
            : undefined;

          return (
            <div
              key={i}
              className={cn(
                "flex gap-2 animate-message-in",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {msg.role === "agent" && <Bot className="mt-1 h-4 w-4 shrink-0 text-primary" />}
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/80 text-foreground backdrop-blur-sm"
                }`}
              >
                {msg.text}

                {/* Issue #5: mini-chart inside the bubble */}
                {msg.analytics && (
                  <MiniChart analytics={msg.analytics} />
                )}

                {/* Insights — unchanged */}
                {msg.analytics?.insights?.length ? (
                  <ul className="mt-2 space-y-1 text-xs opacity-80">
                    {msg.analytics.insights.map((ins, j) => (
                      <li key={j}>• {ins}</li>
                    ))}
                  </ul>
                ) : null}

                {/* Issue #6: differentiated error display */}
                {msg.errorKind && (() => {
                  const meta = ERROR_META[msg.errorKind];
                  const Icon = meta.icon;
                  return (
                    <div className="mt-2 space-y-1">
                      <p className={cn("flex items-center gap-1 text-xs", meta.color)}>
                        <Icon className="h-3 w-3 shrink-0" />
                        {meta.label}
                      </p>
                      {/* Issue #6: retry button */}
                      {prevUserText && (
                        <button
                          onClick={() => sendMessage(prevUserText)}
                          disabled={loading}
                          className="mt-1 flex items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-[11px] text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground disabled:opacity-40"
                        >
                          <RefreshCw className="h-2.5 w-2.5" />
                          Retry
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Raw error detail (non-classified, unchanged behaviour) */}
                {msg.error && !msg.errorKind && (
                  <p className="mt-1 text-xs text-red-400">⚠ {msg.error}</p>
                )}
              </div>
              {msg.role === "user" && <User className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-2 animate-message-in">
            <Bot className="mt-1 h-4 w-4 text-primary" />
            <div className="flex items-center gap-1.5 rounded-2xl bg-muted/80 px-3 py-2">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar — unchanged */}
      <div className="flex gap-2 border-t border-border/60 bg-background/30 px-3 py-2">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask about revenue, mentions, or platforms…"
          disabled={loading}
          className="flex-1 rounded-xl border-border/70 bg-background/50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all duration-200 hover:scale-105 hover:shadow-glow disabled:opacity-40 disabled:hover:scale-100"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}