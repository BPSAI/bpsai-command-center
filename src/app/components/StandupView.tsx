"use client";

import { useEffect, useState, useCallback } from "react";
import { formatTime, formatDate } from "../lib/format";

interface MetisMessage {
  id: string;
  type: string;
  from_project: string;
  content: string;
  severity: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  briefing: { label: "BRIEFING", color: "text-accent" },
  "hypothesis-update": { label: "HYPOTHESIS", color: "text-warning" },
  "cycle-complete": { label: "CYCLE", color: "text-success" },
  "standup": { label: "STANDUP", color: "text-accent" },
};

export default function StandupView() {
  const [messages, setMessages] = useState<MetisMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetisMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/metis?limit=20");
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      const raw = json.messages ?? [];
      setMessages(raw);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetisMessages();
    const interval = setInterval(fetchMetisMessages, 5 * 60 * 1000);
    const handleFocus = () => fetchMetisMessages();
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchMetisMessages]);

  return (
    <>
      <div className="panel-header">
        <span className="status-dot" />
        Metis Standup
        <a
          href="https://agentlounge.ai/standup"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-accent/50 hover:text-accent text-[10px] font-normal normal-case tracking-normal"
        >
          Full Dashboard &rarr;
        </a>
      </div>
      <div className="panel-body">
        {loading && messages.length === 0 && (
          <div className="text-foreground/30 text-xs text-center py-4">
            Loading Metis activity...
          </div>
        )}
        {error && messages.length === 0 && (
          <div className="text-danger text-xs text-center py-4">{error}</div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div className="text-foreground/30 text-xs text-center py-4">
            No Metis messages in channel yet.
            <br />
            <a
              href="https://agentlounge.ai/standup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent/50 hover:text-accent"
            >
              View full standup on Agent Lounge &rarr;
            </a>
          </div>
        )}
        {messages.length > 0 && (
          <div className="space-y-2">
            {messages.map((msg) => {
              const typeInfo = TYPE_LABELS[msg.type] ?? {
                label: msg.type.toUpperCase(),
                color: "text-foreground/50",
              };
              return (
                <div
                  key={msg.id}
                  className="border-b border-panel-border/30 pb-2 last:border-0"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`text-[9px] font-semibold uppercase ${typeInfo.color}`}
                    >
                      {typeInfo.label}
                    </span>
                    <span className="text-[10px] text-foreground/25">
                      {formatDate(msg.created_at)} {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <div className="text-xs text-foreground/70 leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
