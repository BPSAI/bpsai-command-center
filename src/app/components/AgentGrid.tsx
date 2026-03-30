"use client";

import { useEffect, useState } from "react";

interface AgentStatus {
  name: string;
  state: "running" | "idle" | "errored" | "unknown";
  currentTask: string | null;
  lastActive: string;
}

const STATE_STYLES: Record<
  string,
  { dot: string; border: string; label: string }
> = {
  running: {
    dot: "bg-success",
    border: "border-success/30",
    label: "text-success",
  },
  idle: {
    dot: "bg-foreground/30",
    border: "border-foreground/20",
    label: "text-foreground/50",
  },
  errored: {
    dot: "bg-danger",
    border: "border-danger/30",
    label: "text-danger",
  },
  unknown: {
    dot: "bg-foreground/15",
    border: "border-foreground/10",
    label: "text-foreground/30",
  },
};

function timeAgo(ts: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  } catch {
    return ts;
  }
}

export default function AgentGrid() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch("/api/agents");
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        if (!active) return;
        const raw = Array.isArray(data) ? data : data.agents ?? [];
        const list = raw.map((a: Record<string, string | null>) => ({
          name: a.name,
          state: a.state,
          currentTask: a.current_task ?? a.currentTask ?? null,
          lastActive: a.last_active ?? a.lastActive ?? "",
        }));
        setAgents(list);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to fetch");
      } finally {
        if (active) setLoading(false);
      }
    };

    poll();
    const interval = setInterval(poll, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <div className="panel-header">
        <span className="status-dot" />
        Agent Grid
        <span className="ml-auto text-foreground/30 text-[10px] font-normal normal-case tracking-normal">
          {agents.length} agents
        </span>
      </div>
      <div className="panel-body grid grid-cols-2 gap-2 auto-rows-min">
        {loading && agents.length === 0 && (
          <div className="col-span-2 text-foreground/30 text-xs text-center py-4">
            Loading agents...
          </div>
        )}
        {error && agents.length === 0 && (
          <div className="col-span-2 text-danger text-xs text-center py-4">
            {error}
          </div>
        )}
        {agents.map((agent) => {
          const style = STATE_STYLES[agent.state] ?? STATE_STYLES.unknown;
          return (
            <div
              key={agent.name}
              className={`border rounded p-2 text-xs ${style.border}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${style.dot} ${agent.state === "running" ? "animate-pulse" : ""}`}
                />
                <span className="text-accent font-semibold truncate">
                  {agent.name}
                </span>
              </div>
              <div className={`text-[10px] uppercase font-semibold mb-1 ${style.label}`}>
                {agent.state}
              </div>
              <div className="text-foreground/50 truncate">
                {agent.currentTask ?? "No task"}
              </div>
              <div className="text-foreground/20 text-[10px] mt-1">
                {timeAgo(agent.lastActive)}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
