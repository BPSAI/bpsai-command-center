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
          <div className="panel-header">
            <span className="status-dot" />
            Activity Feed
          </div>
          <div className="panel-body">
            <FeedItem time="14:32:01" text="paircoder-bot deployed to staging" kind="success" />
            <FeedItem time="14:31:45" text="Agent claude-nav completed plan review" kind="info" />
            <FeedItem time="14:30:12" text="Build #847 passed — bpsai-agents" kind="success" />
            <FeedItem time="14:28:55" text="PR #42 merged → bpsai-support/main" kind="info" />
            <FeedItem time="14:27:30" text="Memory limit warning on worker-3" kind="warning" />
            <FeedItem time="14:25:01" text="Trello card TRELLO-19 moved to Done" kind="info" />
            <FeedItem time="14:22:18" text="Agent driver-01 idle — awaiting task" kind="dim" />
          </div>
        </div>

        {/* Agent Grid */}
        <div className="panel">
          <div className="panel-header">
            <span className="status-dot" />
            Agent Grid
          </div>
          <div className="panel-body grid grid-cols-2 gap-2">
            <AgentCard name="Navigator" status="active" task="Plan review" />
            <AgentCard name="Driver" status="idle" task="—" />
            <AgentCard name="Reviewer" status="active" task="PR #42" />
            <AgentCard name="QC" status="standby" task="—" />
          </div>
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

function FeedItem({ time, text, kind }: { time: string; text: string; kind: string }) {
  const colors: Record<string, string> = {
    success: "text-success",
    warning: "text-warning",
    info: "text-accent",
    dim: "text-foreground/30",
  };
  return (
    <div className="flex gap-3 py-1.5 border-b border-panel-border/30 last:border-0">
      <span className="text-xs text-foreground/30 shrink-0 tabular-nums">{time}</span>
      <span className={`text-xs ${colors[kind] ?? "text-foreground/60"}`}>{text}</span>
    </div>
  );
}

function AgentCard({ name, status, task }: { name: string; status: string; task: string }) {
  const statusColor =
    status === "active" ? "bg-success" : status === "idle" ? "bg-warning" : "bg-foreground/20";
  return (
    <div className="border border-panel-border rounded p-2 text-xs">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-2 h-2 rounded-full ${statusColor}`} />
        <span className="text-accent font-semibold">{name}</span>
      </div>
      <div className="text-foreground/50">{task}</div>
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
