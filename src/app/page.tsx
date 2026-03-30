import ActivityFeed from "@/app/components/ActivityFeed";
import AgentGrid from "@/app/components/AgentGrid";

export default function Home() {
  return (
    <div className="flex flex-col h-screen p-3 gap-3">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-panel-border">
        <div className="flex items-center gap-3">
          <span className="text-accent font-bold text-sm tracking-widest uppercase">
            BPSAI Command Center
          </span>
          <span className="text-xs text-accent-dim">v0.1.0</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-foreground/50">
          <span>SYS: NOMINAL</span>
          <span className="text-success">● ONLINE</span>
        </div>
      </header>

      {/* 5-panel grid */}
      <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-3 min-h-0">
        {/* Activity Feed — tall left column */}
        <div className="panel row-span-2">
          <ActivityFeed />
        </div>

        {/* Agent Grid */}
        <div className="panel">
          <AgentGrid />
        </div>

        {/* Computer Chat */}
        <div className="panel">
          <div className="panel-header">
            <span className="status-dot" />
            Computer Chat
          </div>
          <div className="panel-body flex flex-col gap-2">
            <ChatBubble from="system" text="Session initialized. All agents online." />
            <ChatBubble from="navigator" text="Plan CC-S1 loaded. 9 tasks queued." />
            <ChatBubble from="driver" text="Ready for task assignment." />
            <div className="mt-auto pt-3 border-t border-panel-border">
              <div className="flex items-center gap-2 text-xs text-foreground/30">
                <span className="text-accent">›</span>
                <span>Type a command...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="panel">
          <div className="panel-header">
            <span className="status-dot" style={{ background: "var(--warning)" }} />
            Notifications
          </div>
          <div className="panel-body flex flex-col gap-2">
            <Notification level="warn" text="Sprint budget at 78% — 3 tasks remaining" />
            <Notification level="info" text="New Trello card assigned: T1.10" />
            <Notification level="error" text="Deploy pipeline timeout on bpsai-a2a" />
            <Notification level="info" text="Standup summary generated for 2026-03-30" />
          </div>
        </div>

        {/* Standup */}
        <div className="panel">
          <div className="panel-header">
            <span className="status-dot" />
            Standup
          </div>
          <div className="panel-body text-sm">
            <div className="mb-3">
              <div className="text-accent text-xs mb-1">YESTERDAY</div>
              <ul className="list-disc list-inside text-foreground/70 space-y-1">
                <li>Scaffolded Command Center (Next.js 15)</li>
                <li>Configured PairCoder project</li>
              </ul>
            </div>
            <div className="mb-3">
              <div className="text-accent text-xs mb-1">TODAY</div>
              <ul className="list-disc list-inside text-foreground/70 space-y-1">
                <li>Implement panel layout + ship theme</li>
                <li>Wire up real-time activity feed</li>
              </ul>
            </div>
            <div>
              <div className="text-danger text-xs mb-1">BLOCKERS</div>
              <p className="text-foreground/50">None</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function ChatBubble({ from, text }: { from: string; text: string }) {
  return (
    <div className="text-xs">
      <span className="text-accent font-semibold">[{from}]</span>{" "}
      <span className="text-foreground/70">{text}</span>
    </div>
  );
}

function Notification({ level, text }: { level: string; text: string }) {
  const icons: Record<string, string> = { warn: "⚠", error: "✗", info: "●" };
  const colors: Record<string, string> = {
    warn: "text-warning",
    error: "text-danger",
    info: "text-accent",
  };
  return (
    <div className={`text-xs flex gap-2 ${colors[level] ?? ""}`}>
      <span>{icons[level] ?? "●"}</span>
      <span>{text}</span>
    </div>
  );
}
