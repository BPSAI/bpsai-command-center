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

function shortId(id: string): string {
  return id.slice(0, 8);
}

/** Parse dispatch content — structured JSON or plain text */
function parseDispatch(content: string): { agent: string; target: string; prompt: string } | null {
  try {
    const parsed = JSON.parse(content);
    if ("agent" in parsed && "target" in parsed && "prompt" in parsed) {
      return parsed;
    }
  } catch { /* plain text */ }
  return null;
}

/** Parse dispatch-result content */
function parseDispatchResult(content: string): {
  success: boolean;
  output: string;
  dispatchId: string;
} | null {
  try {
    const parsed = JSON.parse(content);
    if ("success" in parsed && "output" in parsed) {
      return {
        success: parsed.success,
        output: parsed.output ?? "",
        dispatchId: parsed.dispatch_id ?? "",
      };
    }
  } catch { /* not JSON */ }
  return null;
}

/** Render human-readable content for a message */
function renderContent(msg: FeedMessage): {
  summary: string;
  detail: string | null;
  color: string;
  refId: string | null;
} {
  // Dispatch command
  if (msg.type === "dispatch") {
    const parsed = parseDispatch(msg.content);
    if (parsed) {
      return {
        summary: `Dispatch ${parsed.agent} → ${parsed.target}: ${parsed.prompt}`,
        detail: `Agent: ${parsed.agent}\nTarget: ${parsed.target}\nPrompt: ${parsed.prompt}`,
        color: "text-accent",
        refId: null,
      };
    }
    return { summary: msg.content, detail: null, color: "text-accent", refId: null };
  }

  // Dispatch result
  if (msg.type === "dispatch-result") {
    const parsed = parseDispatchResult(msg.content);
    if (parsed) {
      return {
        summary: parsed.success ? "Dispatch complete" : "Dispatch failed",
        detail: parsed.output,
        color: parsed.success ? "text-success" : "text-danger",
        refId: parsed.dispatchId || null,
      };
    }
    return { summary: msg.content, detail: null, color: "text-foreground/60", refId: null };
  }

  // Everything else
  return {
    summary: msg.content,
    detail: null,
    color: SEVERITY_TEXT[msg.severity] ?? "text-foreground/60",
    refId: null,
  };
}

export default function ActivityFeed() {
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [filterProject, setFilterProject] = useState("");
  const [filterAgent, setFilterAgent] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/feed");

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "messages" && data.messages) {
          const raw = data.messages.messages ?? data.messages;
          if (!Array.isArray(raw)) return;
          const mapped: FeedMessage[] = raw.map((m: Record<string, string>) => ({
            id: m.id,
            timestamp: m.created_at,
            from: m.from_project,
            to: m.to_project,
            type: m.type,
            content: m.content,
            severity: m.severity === "critical" || m.severity === "high" ? "error"
              : m.severity === "medium" ? "warning"
              : m.severity === "low" ? "success"
              : "info",
            project: m.from_project,
          }));
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = mapped.filter((m) => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            // Sort newest first
            const all = [...prev, ...newMsgs];
            all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return all.slice(0, 200);
          });
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, []);

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

  const handleMouseEnter = useCallback((e: React.MouseEvent, id: string, detail: string | null) => {
    if (!detail) return;
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    setDismissingId(null);
    // Position relative to the panel, not the viewport
    const row = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const panel = panelRef.current?.getBoundingClientRect();
    if (panel) {
      // Center horizontally over the panel, below the hovered row
      setHoverPos({
        x: panel.left + panel.width / 2 - 200, // 200 = half of 400px width
        y: row.bottom + 8,
      });
    } else {
      setHoverPos({ x: row.left, y: row.bottom + 8 });
    }
    setHoveredId(id);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoveredId) {
      setDismissingId(hoveredId);
      dismissTimer.current = setTimeout(() => {
        setHoveredId(null);
        setDismissingId(null);
      }, 200); // match animation duration
    }
  }, [hoveredId]);

  const activeId = hoveredId ?? dismissingId;
  const activeMsg = activeId ? filtered.find((m) => m.id === activeId) : null;
  const activeDetail = activeMsg ? renderContent(activeMsg).detail : null;

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
      <div className="panel-body" ref={(el) => { scrollRef.current = el; panelRef.current = el; }}>
        {filtered.length === 0 && (
          <div className="text-foreground/30 text-xs text-center py-4">
            {messages.length === 0
              ? "Waiting for messages..."
              : "No messages match filters"}
          </div>
        )}
        {filtered.map((msg) => {
          const rendered = renderContent(msg);
          const hasDetail = rendered.detail !== null;

          return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              className={`py-1.5 border-b border-panel-border/30 last:border-0 transition-all duration-500 ${hasDetail ? "cursor-pointer" : ""}`}
              onMouseEnter={(e) => handleMouseEnter(e, msg.id, rendered.detail)}
              onMouseLeave={handleMouseLeave}
            >
              <div className="flex gap-3 items-start">
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
                    <span className="ml-2 text-foreground/15 text-[9px]">
                      {shortId(msg.id)}
                    </span>
                  </div>
                  <div className={`text-xs ${rendered.color}`}>
                    {rendered.summary}
                    {rendered.refId && (
                      <button
                        className="ml-2 text-[9px] text-accent/50 hover:text-accent underline underline-offset-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          const el = document.getElementById(`msg-${rendered.refId}`);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "center" });
                            el.classList.add("ring-1", "ring-accent/40");
                            setTimeout(() => el.classList.remove("ring-1", "ring-accent/40"), 2000);
                          }
                        }}
                      >
                        → {shortId(rendered.refId)}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating detail panel — 3D hover effect */}
      {activeId && activeDetail && (
        <div
          className={dismissingId ? "detail-hologram detail-hologram-out" : "detail-hologram"}
          style={{
            position: "fixed",
            left: Math.max(10, Math.min(hoverPos.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 420)),
            top: Math.max(10, Math.min(hoverPos.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 300)),
            zIndex: 100,
          }}
        >
          <div className="text-[10px] text-accent/80 uppercase tracking-wider mb-2 font-semibold">
            Detail — {shortId(activeId)}
          </div>
          <div className="text-[11px] text-foreground/80 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
            {activeDetail}
          </div>
        </div>
      )}
    </>
  );
}
