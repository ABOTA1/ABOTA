"use client";

// components/chat/AgentChatPanel.tsx – Conversational interface with the Gemini agent.
// Sends questions to POST /api/chat and displays answers + analytics.

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
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
  /** Called when the agent returns analytics data – use to update charts on the dashboard */
  onAnalytics?: (analytics: AnalyticsResult | null) => void;
  className?: string;
}

// Suggested starter questions shown before first message
const SUGGESTIONS = [
  "¿Cuáles son las 5 películas con mayor taquilla total?",
  "Muéstrame la tendencia de ingresos de Neon Dragons",
  "Compara las menciones sociales por plataforma",
  "¿Qué día tuvo mayor recaudación en el periodo?",
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
    <div className={cn("rounded-xl border bg-card shadow-sm flex flex-col min-h-[24rem] h-[min(32rem,70vh)]", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Bot className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">ABOTA Agent</span>
        <span className="ml-auto text-xs text-muted-foreground">Powered by Gemini</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 mt-8 px-2">
            <Bot className="w-8 h-8 text-muted-foreground/70" />
            <p className="text-sm font-medium text-center">No questions yet</p>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              Ask about box office, streaming, or social trends. The chart on this dashboard updates when the agent returns data.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border transition-all duration-150 hover:bg-accent hover:border-primary/40 hover:text-foreground active:scale-95"
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
            {msg.role === "agent" && <Bot className="w-4 h-4 mt-1 text-primary shrink-0" />}
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap shadow-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
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
              {msg.error && (
                <p className="mt-1 text-xs text-red-400">⚠ {msg.error}</p>
              )}
            </div>
            {msg.role === "user" && <User className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 animate-message-in">
            <Bot className="w-4 h-4 mt-1 text-primary" />
            <div className="bg-muted rounded-xl px-3 py-2 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-3 py-2 flex gap-2">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask about box office, trends, platforms…"
          disabled={loading}
          className="flex-1"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="p-1.5 rounded-lg text-primary transition-all duration-150 hover:bg-accent disabled:opacity-40 active:scale-90"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
