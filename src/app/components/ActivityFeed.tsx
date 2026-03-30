"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface FeedMessage {
  id: string;
  timestamp: string;
  from: string;
  to: string;
  type: string;
  content: string;
  severity: "info" | "success" | "warning" | "error";
  project?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  success: "bg-success/20 text-success",
  warning: "bg-warning/20 text-warning",
  error: "bg-danger/20 text-danger",
  info: "bg-accent/20 text-accent",
};

const SEVERITY_TEXT: Record<string, string> = {
  success: "text-success",
  warning: "text-warning",
  error: "text-danger",
  info: "text-accent",
};

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function ActivityFeed() {
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [filterProject, setFilterProject] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/feed");

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "messages" && Array.isArray(data.messages)) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = data.messages.filter(
              (m: FeedMessage) => !existingIds.has(m.id)
            );
            if (newMsgs.length === 0) return prev;
            return [...newMsgs, ...prev].slice(0, 200);
          });
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, []);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Auto-scroll to top when new messages arrive
  useEffect(() => {
    scrollToTop();
  }, [messages.length, scrollToTop]);

  const projects = [...new Set(messages.map((m) => m.project).filter(Boolean))];
  const agents = [
    ...new Set(
      messages.flatMap((m) => [m.from, m.to]).filter(Boolean)
    ),
  ];

  const filtered = messages.filter((m) => {
    if (filterProject && m.project !== filterProject) return false;
    if (filterAgent && m.from !== filterAgent && m.to !== filterAgent)
      return false;
    if (filterSeverity && m.severity !== filterSeverity) return false;
    return true;
  });

  return (
    <>
      <div className="panel-header">
        <span
          className="status-dot"
          style={{
            background: connected ? "var(--success)" : "var(--danger)",
          }}
        />
        Activity Feed
        <span className="ml-auto text-foreground/30 text-[10px] font-normal normal-case tracking-normal">
          {connected ? "LIVE" : "DISCONNECTED"}
        </span>
      </div>

      {/* Filter bar */}
      <div className="flex gap-1.5 px-3 py-2 border-b border-panel-border text-[10px]">
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="bg-panel-bg border border-panel-border rounded px-1.5 py-0.5 text-foreground/70 text-[10px]"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
          className="bg-panel-bg border border-panel-border rounded px-1.5 py-0.5 text-foreground/70 text-[10px]"
        >
          <option value="">All Agents</option>
          {agents.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="bg-panel-bg border border-panel-border rounded px-1.5 py-0.5 text-foreground/70 text-[10px]"
        >
          <option value="">All Severity</option>
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Messages */}
      <div className="panel-body" ref={scrollRef}>
        {filtered.length === 0 && (
          <div className="text-foreground/30 text-xs text-center py-4">
            {messages.length === 0
              ? "Waiting for messages..."
              : "No messages match filters"}
          </div>
        )}
        {filtered.map((msg) => (
          <div
            key={msg.id}
            className="flex gap-3 py-1.5 border-b border-panel-border/30 last:border-0 items-start"
          >
            <span className="text-[10px] text-foreground/30 shrink-0 tabular-nums pt-0.5">
              {formatTime(msg.timestamp)}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 font-semibold uppercase ${SEVERITY_COLORS[msg.severity] ?? "bg-foreground/10 text-foreground/50"}`}
            >
              {msg.severity}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-foreground/40 mb-0.5">
                <span className="text-accent">{msg.from}</span>
                {msg.to && (
                  <>
                    {" "}
                    <span className="text-foreground/20">&rarr;</span>{" "}
                    <span className="text-accent">{msg.to}</span>
                  </>
                )}
                {msg.type && (
                  <span className="ml-2 text-foreground/20">[{msg.type}]</span>
                )}
              </div>
              <div
                className={`text-xs truncate ${SEVERITY_TEXT[msg.severity] ?? "text-foreground/60"}`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
