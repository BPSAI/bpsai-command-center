"use client";

import type { SessionMeta } from "@/lib/chat-storage";

interface SessionSidebarProps {
  sessions: SessionMeta[];
  activeSessionId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onClear: () => void;
}

export default function SessionSidebar({
  sessions,
  activeSessionId,
  onSelect,
  onNewChat,
  onClear,
}: SessionSidebarProps) {
  return (
    <div className="flex flex-col h-full border-r border-panel-border bg-panel/50 w-48 shrink-0">
      <div className="flex gap-1 p-2 border-b border-panel-border">
        <button
          onClick={onNewChat}
          className="flex-1 text-[10px] text-accent hover:text-accent-dim border border-panel-border rounded px-2 py-1"
        >
          New Chat
        </button>
        <button
          onClick={onClear}
          className="text-[10px] text-red-400 hover:text-red-300 border border-panel-border rounded px-2 py-1"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 && (
          <div className="text-foreground/30 text-[10px] text-center py-4">
            No conversations yet
          </div>
        )}
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={`w-full text-left px-2 py-1.5 text-[10px] border-b border-panel-border/50 hover:bg-panel-border/30 transition-colors ${
              session.id === activeSessionId
                ? "bg-accent/10 text-accent"
                : "text-foreground/60"
            }`}
          >
            <div className="truncate">
              {session.preview || "Empty session"}
            </div>
            <div className="text-foreground/30 text-[9px]">
              {formatTime(session.updatedAt)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
