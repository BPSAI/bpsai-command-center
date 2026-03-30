import ActivityFeed from "@/app/components/ActivityFeed";
import AgentGrid from "@/app/components/AgentGrid";
import ComputerChat from "@/app/components/ComputerChat";
import NotificationCenter from "@/app/components/NotificationCenter";
import StandupView from "@/app/components/StandupView";

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
          <ComputerChat />
        </div>

        {/* Notifications */}
        <div className="panel">
          <NotificationCenter />
        </div>

        {/* Standup */}
        <div className="panel">
          <StandupView />
        </div>
      </div>
    </div>
  );
}
