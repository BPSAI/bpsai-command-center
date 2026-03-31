import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import SessionCatalog from "@/app/components/SessionCatalog";

// --- Pure logic under test ---

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

/** Map session status to badge color class */
function statusBadgeClass(status: SessionStatus): string {
  switch (status) {
    case "started":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "running":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "complete":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "failed":
      return "bg-red-500/20 text-red-400 border-red-500/30";
  }
}

/** Format duration between two ISO timestamps */
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

/** Truncate command for list display */
function truncateCommand(cmd: string, max: number = 60): string {
  if (cmd.length <= max) return cmd;
  return cmd.slice(0, max - 1) + "…";
}

describe("statusBadgeClass", () => {
  it("returns yellow for started", () => {
    expect(statusBadgeClass("started")).toContain("yellow");
  });

  it("returns blue for running", () => {
    expect(statusBadgeClass("running")).toContain("blue");
  });

  it("returns green for complete", () => {
    expect(statusBadgeClass("complete")).toContain("green");
  });

  it("returns red for failed", () => {
    expect(statusBadgeClass("failed")).toContain("red");
  });
});

describe("formatDuration", () => {
  it("shows seconds for short durations", () => {
    const start = "2026-03-31T10:00:00Z";
    const end = "2026-03-31T10:00:45Z";
    expect(formatDuration(start, end)).toBe("45s");
  });

  it("shows minutes and seconds", () => {
    const start = "2026-03-31T10:00:00Z";
    const end = "2026-03-31T10:05:30Z";
    expect(formatDuration(start, end)).toBe("5m 30s");
  });

  it("shows hours and minutes", () => {
    const start = "2026-03-31T10:00:00Z";
    const end = "2026-03-31T12:15:00Z";
    expect(formatDuration(start, end)).toBe("2h 15m");
  });

  it("returns dash for invalid start", () => {
    expect(formatDuration("invalid", "2026-03-31T10:00:00Z")).toBe("—");
  });

  it("returns dash for invalid end", () => {
    expect(formatDuration("2026-03-31T10:00:00Z", "invalid")).toBe("—");
  });

  it("handles 0-second duration", () => {
    const ts = "2026-03-31T10:00:00Z";
    expect(formatDuration(ts, ts)).toBe("0s");
  });
});

describe("truncateCommand", () => {
  it("keeps short commands as-is", () => {
    expect(truncateCommand("ls -la")).toBe("ls -la");
  });

  it("truncates long commands", () => {
    const long = "a".repeat(100);
    const result = truncateCommand(long, 60);
    expect(result.length).toBe(60);
    expect(result.endsWith("…")).toBe(true);
  });

  it("keeps command at exact max length", () => {
    const exact = "a".repeat(60);
    expect(truncateCommand(exact, 60)).toBe(exact);
  });
});

// --- Component rendering tests ---

const MOCK_SESSIONS: Session[] = [
  {
    session_id: "sess-001",
    operator: "alice",
    machine: "srv-01",
    command: "deploy --env production",
    status: "complete",
    started_at: "2026-03-31T10:00:00Z",
    finished_at: "2026-03-31T10:05:30Z",
    output_summary: "Deployed 3 services",
  },
  {
    session_id: "sess-002",
    operator: "alice",
    machine: "srv-02",
    command: "run-tests --suite integration",
    status: "running",
    started_at: "2026-03-31T11:00:00Z",
  },
  {
    session_id: "sess-003",
    operator: "bob",
    machine: "srv-01",
    command: "backup --full",
    status: "failed",
    started_at: "2026-03-31T09:00:00Z",
    finished_at: "2026-03-31T09:01:00Z",
    output_summary: "Disk full",
  },
];

describe("SessionCatalog rendering", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_SESSIONS,
    });
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "operator=alice",
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("fetches sessions on mount", async () => {
    render(<SessionCatalog />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/sessions"),
      );
    });
  });

  it("displays session rows after fetch", async () => {
    render(<SessionCatalog />);

    await waitFor(() => {
      expect(screen.getByText(/deploy --env production/i)).toBeDefined();
      expect(screen.getByText(/run-tests/i)).toBeDefined();
    });
  });

  it("shows status badges with correct text", async () => {
    render(<SessionCatalog />);

    await waitFor(() => {
      expect(screen.getAllByText("complete").length).toBeGreaterThan(0);
      expect(screen.getAllByText("running").length).toBeGreaterThan(0);
      expect(screen.getAllByText("failed").length).toBeGreaterThan(0);
    });
  });

  it("shows detail view when session is clicked", async () => {
    render(<SessionCatalog />);

    await waitFor(() => {
      expect(screen.getByText(/deploy --env production/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/deploy --env production/i));

    await waitFor(() => {
      expect(screen.getByText(/Deployed 3 services/i)).toBeDefined();
      expect(screen.getByText(/srv-01/i)).toBeDefined();
    });
  });

  it("handles fetch error gracefully", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    render(<SessionCatalog />);

    await waitFor(() => {
      expect(screen.getByText(/no sessions/i)).toBeDefined();
    });
  });
});
