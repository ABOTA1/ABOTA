"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { askAgent } from "@/lib/api";
import type { AnalyticsResult, ChatResponse } from "@/types/analytics";

interface Message {
  role: "user" | "agent";
  text: string;
  analytics?: AnalyticsResult;
  error?: string;
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

export function AgentChatPanel({ onAnalytics, className }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);

    try {
      const res: ChatResponse = await askAgent(question);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: res.answer,
          analytics: res.analytics ?? undefined,
          error: res.error ?? undefined,
        },
      ]);
      if (res.analytics) onAnalytics?.(res.analytics);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: "Error connecting to the agent.", error: String(err) },
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
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Bot className="h-4 w-4" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold leading-none">ABOTA Agent</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Gemini · ClickHouse Cloud</p>
        </div>
        <Sparkles className="ml-auto h-4 w-4 text-chart-3" />
      </div>

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

        {messages.map((msg, i) => (
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
              {msg.analytics?.insights?.length ? (
                <ul className="mt-2 space-y-1 text-xs opacity-80">
                  {msg.analytics.insights.map((ins, j) => (
                    <li key={j}>• {ins}</li>
                  ))}
                </ul>
              ) : null}
              {msg.error && <p className="mt-1 text-xs text-red-400">⚠ {msg.error}</p>}
            </div>
            {msg.role === "user" && <User className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
          </div>
        ))}

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
