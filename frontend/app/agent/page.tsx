"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { AgentChatPanel } from "@/components/chat/AgentChatPanel";
import { AnalyticsChart } from "@/components/charts/AnalyticsChart";
import { ChartCard } from "@/components/layout/ChartCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageFrame } from "@/components/layout/PageFrame";
import { PageHeader } from "@/components/layout/PageHeader";
import type { AnalyticsResult } from "@/types/analytics";

export default function AgentPage() {
  const [agentAnalytics, setAgentAnalytics] = useState<AnalyticsResult | null>(null);

  return (
    <PageFrame className="flex min-h-full flex-col xl:h-[calc(100dvh-3.5rem)] xl:max-h-[calc(100dvh-3.5rem)] xl:overflow-hidden">
      <PageHeader
        className="mb-5 shrink-0"
        eyebrow="Agent"
        title="Ask, then see"
        description="Chat on one side, the chart it produces on the other. Nothing else crowding the frame."
      />

      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-2">
        <ChartCard
          className="min-h-[22rem] xl:min-h-0"
          title={agentAnalytics?.title || "Result chart"}
          description={agentAnalytics ? undefined : "Fills in after you ask a question"}
          delayMs={60}
        >
          {agentAnalytics?.series?.length ? (
            <div className="h-[240px] w-full min-w-0 sm:h-[280px] xl:h-[min(420px,calc(100dvh-22rem))]">
              <AnalyticsChart analytics={agentAnalytics} />
            </div>
          ) : (
            <EmptyState
              className="min-h-[12rem] py-6"
              icon={MessageSquare}
              title="Waiting for a question"
              description="Ask about box office, mentions, or platforms. The chart stays here."
            />
          )}
        </ChartCard>

        <section className="animate-rise flex min-h-[24rem] flex-col xl:min-h-0" style={{ animationDelay: "140ms" }}>
          <AgentChatPanel
            onAnalytics={setAgentAnalytics}
            className="h-full min-h-[24rem] xl:min-h-0"
          />
        </section>
      </div>
    </PageFrame>
  );
}
