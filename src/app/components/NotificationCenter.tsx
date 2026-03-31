"use client";

import { useEffect, useState, useCallback } from "react";

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

interface Notification extends FeedMessage {
  acknowledged: boolean;
}

const ACTIONABLE_TYPES = ["review", "approval", "blocked", "failure"];

function isActionable(msg: FeedMessage): boolean {
  if (msg.severity === "error") return true;
  const typeLower = (msg.type ?? "").toLowerCase();
  return ACTIONABLE_TYPES.some((t) => typeLower.includes(t));
}

const LEVEL_STYLES: Record<string, { icon: string; color: string }> = {
  error: { icon: "✗", color: "text-danger" },
  warning: { icon: "⚠", color: "text-warning" },
  info: { icon: "●", color: "text-accent" },
  success: { icon: "✓", color: "text-success" },
};

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);

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

          const actionable: Notification[] = mapped
            .filter(isActionable)
            .map((m) => ({ ...m, acknowledged: false }));

          if (actionable.length === 0) return;

          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const newItems = actionable.filter(
              (n: Notification) => !existingIds.has(n.id),
            );
            if (newItems.length === 0) return prev;
            return [...newItems, ...prev].slice(0, 100);
          });
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, []);

  const acknowledge = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, acknowledged: true } : n)),
    );

    try {
      await fetch("/api/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_id: id }),
      });
    } catch {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, acknowledged: false } : n)),
      );
    }
  }, []);

  const unacknowledgedCount = notifications.filter((n) => !n.acknowledged).length;

  return (
    <>
      <div className="panel-header">
        <span
          className="status-dot"
          style={{
            background:
              unacknowledgedCount > 0 ? "var(--warning)" : "var(--success)",
          }}
        />
        Notifications
        {unacknowledgedCount > 0 && (
          <span className="ml-2 bg-warning/20 text-warning text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {unacknowledgedCount}
          </span>
        )}
        <span className="ml-auto text-foreground/30 text-[10px] font-normal normal-case tracking-normal">
          {connected ? "LIVE" : "DISCONNECTED"}
        </span>
      </div>
      <div className="panel-body flex flex-col gap-1">
        {notifications.length === 0 && (
          <div className="text-foreground/30 text-xs text-center py-4">
            No actionable notifications
          </div>
        )}
        {notifications.map((notif) => {
          const style = LEVEL_STYLES[notif.severity] ?? LEVEL_STYLES.info;
          return (
            <div
              key={notif.id}
              className={`flex items-start gap-2 py-1.5 border-b border-panel-border/30 last:border-0 transition-opacity duration-500 ${
                notif.acknowledged ? "opacity-30" : ""
              }`}
            >
              <span className={`text-xs shrink-0 ${style.color}`}>
                {style.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-foreground/40 mb-0.5">
                  <span className="text-accent">{notif.from}</span>
                  {notif.type && (
                    <span className="ml-1 text-foreground/20">
                      [{notif.type}]
                    </span>
                  )}
                  <span className="ml-2 text-foreground/20">
                    {formatTime(notif.timestamp)}
                  </span>
                </div>
                <div className={`text-xs truncate ${style.color}`}>
                  {notif.content}
                </div>
              </div>
              {!notif.acknowledged && (
                <button
                  onClick={() => acknowledge(notif.id)}
                  className="text-[10px] text-foreground/40 hover:text-accent shrink-0 border border-panel-border rounded px-1.5 py-0.5"
                >
                  ACK
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
