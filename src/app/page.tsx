"use client";

import { useState, useEffect } from "react";
import ActivityFeed from "@/app/components/ActivityFeed";
import AgentGrid from "@/app/components/AgentGrid";
import ComputerChat from "@/app/components/ComputerChat";
import NotificationCenter from "@/app/components/NotificationCenter";
import StandupView from "@/app/components/StandupView";

function getOperator(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)operator=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

const PANELS = [
  { id: "feed", label: "Feed", icon: "◉" },
  { id: "agents", label: "Agents", icon: "◈" },
  { id: "computer", label: "Computer", icon: "◇" },
  { id: "notifs", label: "Alerts", icon: "⚡" },
  { id: "standup", label: "Standup", icon: "◎" },
] as const;

type PanelId = (typeof PANELS)[number]["id"];

export default function Home() {
  const [activePanel, setActivePanel] = useState<PanelId>("feed");
  const [operator, setOperator] = useState("");

  useEffect(() => {
    setOperator(getOperator());
  }, []);

  function handleLogout() {
    fetch("/api/logout").then(() => {
      // Clear cookies and force re-auth by reloading
      document.cookie = "operator=; max-age=0; path=/";
      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col h-screen p-2 sm:p-3 gap-2 sm:gap-3">
      {/* Top bar */}
      <header className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-panel-border">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-accent font-bold text-xs sm:text-sm tracking-widest uppercase">
            <span className="hidden sm:inline">BPSAI </span>Command Center
          </span>
          <span className="text-[10px] sm:text-xs text-accent-dim">v0.1.0</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-foreground/50">
          <span className="hidden sm:inline">SYS: NOMINAL</span>
          <span className="text-success">● ONLINE</span>
          {operator && (
            <>
              <span className="text-accent" title="Operator">
                OP: {operator.toUpperCase()}
              </span>
              <button
                onClick={handleLogout}
                className="text-foreground/40 hover:text-error transition-colors uppercase tracking-wider"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      {/* Mobile tab bar — visible below md */}
      <nav className="flex md:hidden gap-1 px-1 overflow-x-auto scrollbar-none">
        {PANELS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePanel(p.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap transition-all ${
              activePanel === p.id
                ? "bg-accent/15 text-accent border border-accent/30"
                : "text-foreground/40 border border-transparent hover:text-foreground/60"
            }`}
          >
            <span>{p.icon}</span>
            {p.label}
          </button>
        ))}
      </nav>

      {/* Desktop: 5-panel grid / Mobile: single active panel */}

      {/* Desktop grid — hidden below md */}
      <div className="hidden md:grid flex-1 grid-cols-2 lg:grid-cols-3 grid-rows-2 gap-3 min-h-0">
        {/* Activity Feed — tall left column on lg, top-left on md */}
        <div className="panel lg:row-span-2">
          <ActivityFeed />
        </div>

        {/* Agent Grid */}
        <div className="panel">
          <AgentGrid />
        </div>

        {/* Computer Chat — spans 2 cols on md when no 3rd column */}
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

      {/* Mobile: single panel — visible below md */}
      <div className="flex-1 min-h-0 md:hidden">
        <div className="panel h-full">
          {activePanel === "feed" && <ActivityFeed />}
          {activePanel === "agents" && <AgentGrid />}
          {activePanel === "computer" && <ComputerChat />}
          {activePanel === "notifs" && <NotificationCenter />}
          {activePanel === "standup" && <StandupView />}
        </div>
      </div>
    </div>
  );
}
