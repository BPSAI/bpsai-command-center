import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import SessionCatalog from "@/app/components/SessionCatalog";

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

const COMPLETE_SESSION: Session = {
  session_id: "sess-001",
  operator: "alice",
  machine: "srv-01",
  command: "deploy --env production",
  status: "complete",
  started_at: "2026-03-31T10:00:00Z",
  finished_at: "2026-03-31T10:05:30Z",
  output_summary: "Deployed 3 services",
};

const FAILED_SESSION: Session = {
  session_id: "sess-003",
  operator: "alice",
  machine: "srv-01",
  command: "backup --full",
  status: "failed",
  started_at: "2026-03-31T09:00:00Z",
  finished_at: "2026-03-31T09:01:00Z",
  output_summary: "Disk full",
};

const RUNNING_SESSION: Session = {
  session_id: "sess-002",
  operator: "alice",
  machine: "srv-02",
  command: "run-tests --suite integration",
  status: "running",
  started_at: "2026-03-31T11:00:00Z",
};

const BOB_SESSION: Session = {
  session_id: "sess-004",
  operator: "bob",
  machine: "srv-01",
  command: "deploy --env staging",
  status: "complete",
  started_at: "2026-03-31T10:00:00Z",
  finished_at: "2026-03-31T10:02:00Z",
};

describe("Resume button visibility", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "operator=alice",
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows Resume button for complete session owned by operator", async () => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [COMPLETE_SESSION],
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SessionCatalog />);

    await waitFor(() => {
      expect(screen.getByText(/deploy --env production/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/deploy --env production/i));

    await waitFor(() => {
      expect(screen.getByText("Resume")).toBeDefined();
    });
  });

  it("shows Resume button for failed session owned by operator", async () => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [FAILED_SESSION],
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SessionCatalog />);

    await waitFor(() => {
      expect(screen.getByText(/backup --full/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/backup --full/i));

    await waitFor(() => {
      expect(screen.getByText("Resume")).toBeDefined();
    });
  });

  it("does NOT show Resume button for running session", async () => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [RUNNING_SESSION],
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SessionCatalog />);

    await waitFor(() => {
      expect(screen.getByText(/run-tests/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/run-tests/i));

    await waitFor(() => {
      expect(screen.getByText("Session Detail")).toBeDefined();
    });
    expect(screen.queryByText("Resume")).toBeNull();
  });

  it("does NOT show Resume button for another operator's session", async () => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [BOB_SESSION],
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SessionCatalog />);

    await waitFor(() => {
      expect(screen.getByText(/deploy --env staging/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/deploy --env staging/i));

    await waitFor(() => {
      expect(screen.getByText("Session Detail")).toBeDefined();
    });
    expect(screen.queryByText("Resume")).toBeNull();
  });
});

describe("Resume button interaction", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "operator=alice",
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows 'Resume Pending...' while request is in flight", async () => {
    let resolveResume!: (value: Response) => void;
    const resumePromise = new Promise<Response>((res) => {
      resolveResume = res;
    });

    fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/resume")) {
        return resumePromise;
      }
      return Promise.resolve({
        ok: true,
        json: async () => [COMPLETE_SESSION],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SessionCatalog />);

    await waitFor(() => {
      expect(screen.getByText(/deploy --env production/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/deploy --env production/i));

    await waitFor(() => {
      expect(screen.getByText("Resume")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Resume"));

    await waitFor(() => {
      expect(screen.getByText("Resume Pending...")).toBeDefined();
    });

    // Resolve the pending request
    resolveResume(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  });

  it("posts to /api/sessions/{id}/resume on click", async () => {
    fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/resume")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ dispatched: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [COMPLETE_SESSION],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SessionCatalog />);

    await waitFor(() => {
      expect(screen.getByText(/deploy --env production/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/deploy --env production/i));

    await waitFor(() => {
      expect(screen.getByText("Resume")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Resume"));

    await waitFor(() => {
      const resumeCall = fetchMock.mock.calls.find(
        (c: unknown[]) => typeof c[0] === "string" && c[0].includes("/resume"),
      );
      expect(resumeCall).toBeDefined();
      expect(resumeCall![0]).toBe("/api/sessions/sess-001/resume");
      expect(resumeCall![1]).toMatchObject({ method: "POST" });
    });
  });

  it("shows error message when resume fails", async () => {
    fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/resume")) {
        return Promise.resolve({
          ok: false,
          status: 502,
          json: async () => ({ error: "Backend unreachable" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [COMPLETE_SESSION],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SessionCatalog />);

    await waitFor(() => {
      expect(screen.getByText(/deploy --env production/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/deploy --env production/i));

    await waitFor(() => {
      expect(screen.getByText("Resume")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Resume"));

    await waitFor(() => {
      expect(screen.getByText(/Backend unreachable/i)).toBeDefined();
    });
  });

  it("shows error when session is not resumable (409)", async () => {
    fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/resume")) {
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({ error: "Session not resumable" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [COMPLETE_SESSION],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SessionCatalog />);

    await waitFor(() => {
      expect(screen.getByText(/deploy --env production/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/deploy --env production/i));

    await waitFor(() => {
      expect(screen.getByText("Resume")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Resume"));

    await waitFor(() => {
      expect(screen.getByText(/Session not resumable/i)).toBeDefined();
    });
  });
});
