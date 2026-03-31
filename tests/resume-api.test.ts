import { describe, it, expect } from "vitest";

// Pure logic extracted from the resume API route

const RESUMABLE_STATUSES = new Set(["complete", "failed"]);

/** Check if a session can be resumed based on status */
function isResumable(status: string): boolean {
  return RESUMABLE_STATUSES.has(status);
}

/** Validate operator owns the session */
function isOperatorMatch(sessionOperator: string, requestOperator: string): boolean {
  return sessionOperator === requestOperator;
}

/** Build resume dispatch payload */
function buildResumePayload(sessionId: string, operator: string) {
  return {
    type: "resume",
    session_id: sessionId,
    operator,
  };
}

/** Build upstream dispatch URL */
function buildDispatchUrl(base: string): string {
  return new URL("/dispatch", base).toString();
}

describe("isResumable", () => {
  it("allows complete sessions", () => {
    expect(isResumable("complete")).toBe(true);
  });

  it("allows failed sessions", () => {
    expect(isResumable("failed")).toBe(true);
  });

  it("rejects started sessions", () => {
    expect(isResumable("started")).toBe(false);
  });

  it("rejects running sessions", () => {
    expect(isResumable("running")).toBe(false);
  });

  it("rejects unknown status", () => {
    expect(isResumable("pending")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isResumable("")).toBe(false);
  });
});

describe("isOperatorMatch", () => {
  it("matches same operator", () => {
    expect(isOperatorMatch("alice", "alice")).toBe(true);
  });

  it("rejects different operator", () => {
    expect(isOperatorMatch("alice", "bob")).toBe(false);
  });

  it("rejects empty request operator", () => {
    expect(isOperatorMatch("alice", "")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isOperatorMatch("Alice", "alice")).toBe(false);
  });
});

describe("buildResumePayload", () => {
  it("builds correct payload", () => {
    const payload = buildResumePayload("sess-001", "alice");
    expect(payload).toEqual({
      type: "resume",
      session_id: "sess-001",
      operator: "alice",
    });
  });

  it("includes type=resume", () => {
    const payload = buildResumePayload("sess-002", "bob");
    expect(payload.type).toBe("resume");
  });
});

describe("buildDispatchUrl", () => {
  it("builds dispatch URL from base", () => {
    expect(buildDispatchUrl("https://a2a.test")).toBe("https://a2a.test/dispatch");
  });

  it("handles trailing slash in base", () => {
    expect(buildDispatchUrl("https://a2a.test/")).toBe("https://a2a.test/dispatch");
  });
});
