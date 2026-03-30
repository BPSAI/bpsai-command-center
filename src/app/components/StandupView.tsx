"use client";

import { useEffect, useState, useCallback } from "react";

interface StandupData {
  engagement?: string;
  mood?: string;
  beliefs?: { label: string; confidence: number }[];
  recentActivity?: { text: string; timestamp: string }[];
}

export default function StandupView() {
  const [data, setData] = useState<StandupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStandup = useCallback(async () => {
    try {
      const res = await fetch("/api/standup");
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStandup();
    const interval = setInterval(fetchStandup, 5 * 60 * 1000);

    const handleFocus = () => fetchStandup();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchStandup]);

  return (
    <>
      <div className="panel-header">
        <span className="status-dot" />
        Standup
        <span className="ml-auto text-foreground/30 text-[10px] font-normal normal-case tracking-normal">
          {loading ? "LOADING" : error ? "ERROR" : "OK"}
        </span>
      </div>
      <div className="panel-body text-sm">
        {loading && !data && (
          <div className="text-foreground/30 text-xs text-center py-4">
            Loading standup data...
          </div>
        )}
        {error && !data && (
          <div className="text-danger text-xs text-center py-4">{error}</div>
        )}
        {data && (
          <>
            {/* Current Engagement */}
            <div className="mb-3">
              <div className="text-accent text-xs mb-1">ENGAGEMENT</div>
              <div className="text-foreground/70 text-xs">
                {data.engagement ?? "No active engagement"}
              </div>
            </div>

            {/* Mood Summary */}
            <div className="mb-3">
              <div className="text-accent text-xs mb-1">MOOD</div>
              <div className="text-foreground/70 text-xs">
                {data.mood ?? "Neutral"}
              </div>
            </div>

            {/* Active Beliefs */}
            <div className="mb-3">
              <div className="text-accent text-xs mb-1">ACTIVE BELIEFS</div>
              {data.beliefs && data.beliefs.length > 0 ? (
                <div className="space-y-1">
                  {data.beliefs.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-foreground/70"
                    >
                      <div className="flex-1 truncate">{b.label}</div>
                      <div className="shrink-0 w-16 bg-panel-border/30 rounded-full h-1.5">
                        <div
                          className="bg-accent h-1.5 rounded-full"
                          style={{ width: `${Math.round(b.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-foreground/40 w-8 text-right">
                        {Math.round(b.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-foreground/40 text-xs">
                  No active beliefs
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div>
              <div className="text-accent text-xs mb-1">RECENT ACTIVITY</div>
              {data.recentActivity && data.recentActivity.length > 0 ? (
                <ul className="space-y-1">
                  {data.recentActivity.slice(0, 5).map((a, i) => (
                    <li
                      key={i}
                      className="text-xs text-foreground/70 flex gap-2"
                    >
                      <span className="text-foreground/30 shrink-0">•</span>
                      <span className="truncate">{a.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-foreground/40 text-xs">
                  No recent activity
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
