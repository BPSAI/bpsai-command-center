"use client";

import { useEffect, useState, useCallback } from "react";
import { getOperatorFromCookie } from "@/lib/use-operator";

type SessionStatus = "started" | "running" | "complete" | "failed";

interface Session {
  session_id: string;
  operator: string;
  machine: string;
  command: string;
  status: SessionStatus;
  started_at: string;
  finished_at?: string;
  output_summary?: string;
}

const STATUS_BADGE: Record<SessionStatus, string> = {
  started: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  complete: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_DOT: Record<SessionStatus, string> = {
  started: "bg-yellow-400",
  running: "bg-blue-400",
  complete: "bg-green-400",
  failed: "bg-red-400",
};

function formatDuration(start: string, end?: string): string {
  const startMs = new Date(start).getTime();
  if (isNaN(startMs)) return "—";
  const endMs = end ? new Date(end).getTime() : Date.now();
  if (isNaN(endMs)) return "—";
  const diffSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const min = Math.floor(diffSec / 60);
  const sec = diffSec % 60;
  if (min < 60) return `${min}m ${sec}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

function truncateCommand(cmd: string, max: number = 60): string {
  if (cmd.length <= max) return cmd;
  return cmd.slice(0, max - 1) + "\u2026";
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts;
  }
}

const REFRESH_INTERVAL = 30_000;

export default function SessionCatalog() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Session | null>(null);
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "">("");
  const [resumePending, setResumePending] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const qs = params.toString();
      const url = `/api/sessions${qs ? `?${qs}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.sessions ?? [];
      setSessions(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      if (!active) return;
      await fetchSessions();
    };

    poll();
    const interval = setInterval(poll, REFRESH_INTERVAL);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchSessions]);

  const handleResume = useCallback(async (sessionId: string) => {
    setResumePending(true);
    setResumeError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/resume`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Status ${res.status}` }));
        setResumeError(data.error ?? `Resume failed: ${res.status}`);
        return;
      }
      setResumeError(null);
      // Refresh sessions to reflect change
      await fetchSessions();
    } catch {
      setResumeError("Failed to send resume command");
    } finally {
      setResumePending(false);
    }
  }, [fetchSessions]);

  const [operator, setOperator] = useState("");
  useEffect(() => {
    setOperator(getOperatorFromCookie());
  }, []);

  const canResume =
    selected !== null &&
    (selected.status === "complete" || selected.status === "failed") &&
    selected.operator === operator;

  return (
    <>
      <div className="panel-header">
        <span className="status-dot" />
        Sessions
        <span className="ml-auto flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SessionStatus | "")}
            className="bg-panel-bg border border-panel-border text-[10px] text-foreground/60 rounded px-1 py-0.5 uppercase tracking-wider font-normal normal-case"
          >
            <option value="">All</option>
            <option value="started">Started</option>
            <option value="running">Running</option>
            <option value="complete">Complete</option>
            <option value="failed">Failed</option>
          </select>
          <span className="text-foreground/30 text-[10px] font-normal normal-case tracking-normal">
            {sessions.length} sessions
          </span>
        </span>
      </div>

      <div className="panel-body">
        {loading && sessions.length === 0 && (
          <div className="text-foreground/30 text-xs text-center py-4">
            Loading sessions...
          </div>
        )}

        {error && sessions.length === 0 && (
          <div className="text-danger text-xs text-center py-4">
            No sessions — {error}
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="text-foreground/30 text-xs text-center py-4">
            No sessions found
          </div>
        )}

        {/* Detail overlay */}
        {selected && (
          <div className="mb-3 border border-accent/20 rounded bg-panel-bg/80 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-accent text-xs font-semibold uppercase tracking-wider">
                Session Detail
              </span>
              <button
                onClick={() => setSelected(null)}
                className="text-foreground/40 hover:text-foreground text-xs"
              >
                [close]
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              <div>
                <span className="text-foreground/40">ID: </span>
                <span className="text-foreground/80">{selected.session_id}</span>
              </div>
              <div>
                <span className="text-foreground/40">Command: </span>
                <span className="text-foreground/80 break-all">
                  {selected.command}
                </span>
              </div>
              <div>
                <span className="text-foreground/40">Machine: </span>
                <span className="text-foreground/80">{selected.machine}</span>
              </div>
              <div>
                <span className="text-foreground/40">Operator: </span>
                <span className="text-foreground/80">{selected.operator}</span>
              </div>
              <div>
                <span className="text-foreground/40">Status: </span>
                <span
                  className={`inline-block border rounded px-1.5 py-0.5 text-[10px] uppercase font-semibold ${STATUS_BADGE[selected.status]}`}
                >
                  {selected.status}
                </span>
              </div>
              <div>
                <span className="text-foreground/40">Started: </span>
                <span className="text-foreground/80">
                  {formatTime(selected.started_at)}
                </span>
              </div>
              {selected.finished_at && (
                <div>
                  <span className="text-foreground/40">Finished: </span>
                  <span className="text-foreground/80">
                    {formatTime(selected.finished_at)}
                  </span>
                </div>
              )}
              <div>
                <span className="text-foreground/40">Duration: </span>
                <span className="text-foreground/80">
                  {formatDuration(selected.started_at, selected.finished_at)}
                </span>
              </div>
              {selected.output_summary && (
                <div>
                  <span className="text-foreground/40">Output: </span>
                  <span className="text-foreground/80">
                    {selected.output_summary}
                  </span>
                </div>
              )}
              {resumeError && (
                <div className="text-red-400 text-xs mt-1">{resumeError}</div>
              )}
              {canResume && (
                <div className="mt-2">
                  <button
                    onClick={() => handleResume(selected.session_id)}
                    disabled={resumePending}
                    className="px-3 py-1 rounded text-xs font-semibold border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resumePending ? "Resume Pending..." : "Resume"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Session list */}
        <div className="space-y-1">
          {sessions.map((s) => {
            const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.started;
            const dot = STATUS_DOT[s.status] ?? STATUS_DOT.started;
            const isActive = selected?.session_id === s.session_id;

            return (
              <button
                key={s.session_id}
                onClick={() => {
                  setSelected(isActive ? null : s);
                  setResumeError(null);
                  setResumePending(false);
                }}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all hover:bg-accent/5 ${
                  isActive
                    ? "bg-accent/10 border border-accent/20"
                    : "border border-transparent"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${dot} ${
                    s.status === "running" ? "animate-pulse" : ""
                  }`}
                />
                <span className="text-foreground/70 truncate flex-1">
                  {truncateCommand(s.command)}
                </span>
                <span
                  className={`border rounded px-1.5 py-0.5 text-[10px] uppercase font-semibold shrink-0 ${badge}`}
                >
                  {s.status}
                </span>
                <span className="text-foreground/30 text-[10px] shrink-0">
                  {formatTime(s.started_at)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
