"use client";

import { useState, useEffect } from "react";
import ActivityFeed from "@/app/components/ActivityFeed";
import AgentGrid from "@/app/components/AgentGrid";
import ComputerChat from "@/app/components/ComputerChat";
import NotificationCenter from "@/app/components/NotificationCenter";
import StandupView from "@/app/components/StandupView";
import SessionCatalog from "@/app/components/SessionCatalog";
import { getOperatorFromCookie } from "@/lib/use-operator";

const PANELS = [
  { id: "feed", label: "Feed", icon: "◉" },
  { id: "agents", label: "Agents", icon: "◈" },
  { id: "sessions", label: "Sessions", icon: "◫" },
  { id: "computer", label: "Computer", icon: "◇" },
  { id: "notifs", label: "Alerts", icon: "⚡" },
  { id: "standup", label: "Standup", icon: "◎" },
] as const;

type PanelId = (typeof PANELS)[number]["id"];

export default function Home() {
  const [activePanel, setActivePanel] = useState<PanelId>("feed");
  const [operator, setOperator] = useState("");

  useEffect(() => {
    setOperator(getOperatorFromCookie());
  }, []);

  function handleLogout() {
    fetch("/api/auth/logout", { method: "POST" }).then(() => {
      window.location.href = "/login";
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
        {/* Activity Feed */}
        <div className="panel">
          <ActivityFeed />
        </div>

        {/* Agent Grid */}
        <div className="panel">
          <AgentGrid />
        </div>

        {/* Session Catalog */}
        <div className="panel">
          <SessionCatalog />
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

      {/* Mobile: single panel — visible below md */}
      <div className="flex-1 min-h-0 md:hidden">
        <div className="panel h-full">
          {activePanel === "feed" && <ActivityFeed />}
          {activePanel === "agents" && <AgentGrid />}
          {activePanel === "sessions" && <SessionCatalog />}
          {activePanel === "computer" && <ComputerChat />}
          {activePanel === "notifs" && <NotificationCenter />}
          {activePanel === "standup" && <StandupView />}
        </div>
      </div>
    </div>
  );
}
