"use client";

import { useEffect, useRef, useState } from "react";

export interface FeedMessage {
  id: string;
  timestamp: string;
  from: string;
  to: string;
  type: string;
  content: string;
  severity: "info" | "success" | "warning" | "error";
  project?: string;
}

export function mapSeverity(raw: string): FeedMessage["severity"] {
  if (raw === "critical" || raw === "high") return "error";
  if (raw === "medium") return "warning";
  if (raw === "low") return "success";
  return "info";
}

export function mapRawMessage(m: Record<string, string>): FeedMessage {
  return {
    id: m.id,
    timestamp: m.created_at,
    from: m.from_project,
    to: m.to_project,
    type: m.type,
    content: m.content,
    severity: mapSeverity(m.severity),
    project: m.from_project,
  };
}

/**
 * Shared hook: single EventSource to /api/feed.
 * Returns the latest batch of FeedMessage[] and connection status.
 * Deduplicates by id, keeps newest-first, capped at maxMessages.
 */
export function useFeedMessages(maxMessages = 200) {
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/feed");
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "messages" && data.messages) {
          const raw = data.messages.messages ?? data.messages;
          if (!Array.isArray(raw)) return;

          const mapped: FeedMessage[] = raw.map(
            (m: Record<string, string>) => mapRawMessage(m),
          );

          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = mapped.filter((m) => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            const all = [...prev, ...newMsgs];
            all.sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
            );
            return all.slice(0, maxMessages);
          });
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, [maxMessages]);

  return { messages, connected };
}
