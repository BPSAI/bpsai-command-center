import { describe, it, expect } from "vitest";
import {
  parseDispatch,
  parseDispatchResult,
  parseDispatchAck,
  renderDispatchContent,
  isDispatchType,
} from "../src/app/lib/dispatch-feed";
import type { FeedMessage } from "../src/app/lib/feed";

// ---------------------------------------------------------------------------
// parseDispatch
// ---------------------------------------------------------------------------

describe("parseDispatch", () => {
  it("parses structured JSON with agent, target, prompt", () => {
    const content = JSON.stringify({
      agent: "bpsai-prime",
      target: "bpsai-core",
      prompt: "refactor auth",
    });
    const result = parseDispatch(content);
    expect(result).toEqual({
      agent: "bpsai-prime",
      target: "bpsai-core",
      prompt: "refactor auth",
    });
  });

  it("returns null for plain text", () => {
    expect(parseDispatch("just a string")).toBeNull();
  });

  it("returns null for JSON missing required fields", () => {
    expect(parseDispatch(JSON.stringify({ agent: "x" }))).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseDispatch("{bad json")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseDispatchResult
// ---------------------------------------------------------------------------

describe("parseDispatchResult", () => {
  it("parses success result with agent, repo, output, dispatch_id", () => {
    const content = JSON.stringify({
      success: true,
      output: "All tests passed",
      dispatch_id: "d-123",
      agent: "bpsai-prime",
      repo: "bpsai-core",
    });
    const result = parseDispatchResult(content);
    expect(result).toEqual({
      success: true,
      output: "All tests passed",
      dispatchId: "d-123",
      agent: "bpsai-prime",
      repo: "bpsai-core",
    });
  });

  it("parses failure result", () => {
    const content = JSON.stringify({
      success: false,
      output: "Build failed",
      dispatch_id: "d-456",
      agent: "bpsai-prime",
      repo: "bpsai-iris",
    });
    const result = parseDispatchResult(content);
    expect(result).toEqual({
      success: false,
      output: "Build failed",
      dispatchId: "d-456",
      agent: "bpsai-prime",
      repo: "bpsai-iris",
    });
  });

  it("defaults agent and repo to empty string when missing", () => {
    const content = JSON.stringify({
      success: true,
      output: "done",
    });
    const result = parseDispatchResult(content);
    expect(result!.agent).toBe("");
    expect(result!.repo).toBe("");
    expect(result!.dispatchId).toBe("");
  });

  it("returns null for non-JSON", () => {
    expect(parseDispatchResult("not json")).toBeNull();
  });

  it("returns null for JSON without success field", () => {
    expect(parseDispatchResult(JSON.stringify({ output: "x" }))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseDispatchAck
// ---------------------------------------------------------------------------

describe("parseDispatchAck", () => {
  it("parses ack with agent, repo, dispatch_id", () => {
    const content = JSON.stringify({
      agent: "bpsai-prime",
      repo: "bpsai-core",
      dispatch_id: "d-789",
    });
    const result = parseDispatchAck(content);
    expect(result).toEqual({
      agent: "bpsai-prime",
      repo: "bpsai-core",
      dispatchId: "d-789",
    });
  });

  it("defaults missing fields to empty string", () => {
    const content = JSON.stringify({});
    const result = parseDispatchAck(content);
    expect(result!.agent).toBe("");
    expect(result!.repo).toBe("");
    expect(result!.dispatchId).toBe("");
  });

  it("returns null for non-JSON", () => {
    expect(parseDispatchAck("not json")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isDispatchType
// ---------------------------------------------------------------------------

describe("isDispatchType", () => {
  it("returns true for dispatch", () => {
    expect(isDispatchType("dispatch")).toBe(true);
  });

  it("returns true for dispatch-result", () => {
    expect(isDispatchType("dispatch-result")).toBe(true);
  });

  it("returns true for dispatch-ack", () => {
    expect(isDispatchType("dispatch-ack")).toBe(true);
  });

  it("returns false for regular types", () => {
    expect(isDispatchType("task_complete")).toBe(false);
    expect(isDispatchType("info")).toBe(false);
    expect(isDispatchType("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// renderDispatchContent — dispatch type
// ---------------------------------------------------------------------------

describe("renderDispatchContent — dispatch", () => {
  const base: FeedMessage = {
    id: "msg-1",
    timestamp: "2026-04-08T10:00:00Z",
    from: "cc-operator",
    to: "bpsai-a2a",
    type: "dispatch",
    content: JSON.stringify({
      agent: "bpsai-prime",
      target: "bpsai-core",
      prompt: "fix auth module",
    }),
    severity: "info",
  };

  it("returns summary with agent, target, and prompt", () => {
    const result = renderDispatchContent(base);
    expect(result.summary).toContain("bpsai-prime");
    expect(result.summary).toContain("bpsai-core");
    expect(result.summary).toContain("fix auth module");
  });

  it("returns accent color", () => {
    const result = renderDispatchContent(base);
    expect(result.color).toBe("text-accent");
  });

  it("returns detail with agent, target, prompt", () => {
    const result = renderDispatchContent(base);
    expect(result.detail).toContain("bpsai-prime");
    expect(result.detail).toContain("bpsai-core");
  });

  it("falls back to raw content for non-JSON dispatch", () => {
    const msg = { ...base, content: "plain dispatch text" };
    const result = renderDispatchContent(msg);
    expect(result.summary).toBe("plain dispatch text");
  });
});

// ---------------------------------------------------------------------------
// renderDispatchContent — dispatch-result
// ---------------------------------------------------------------------------

describe("renderDispatchContent — dispatch-result", () => {
  it("shows agent name, repo, and success outcome", () => {
    const msg: FeedMessage = {
      id: "msg-2",
      timestamp: "2026-04-08T10:01:00Z",
      from: "bpsai-prime",
      to: "cc-operator",
      type: "dispatch-result",
      content: JSON.stringify({
        success: true,
        output: "All tests passed",
        dispatch_id: "d-123",
        agent: "bpsai-prime",
        repo: "bpsai-core",
      }),
      severity: "success",
    };
    const result = renderDispatchContent(msg);
    expect(result.summary).toContain("bpsai-prime");
    expect(result.summary).toContain("bpsai-core");
    expect(result.summary).toMatch(/complete|success/i);
    expect(result.color).toBe("text-success");
    expect(result.refId).toBe("d-123");
  });

  it("shows failure outcome with danger color", () => {
    const msg: FeedMessage = {
      id: "msg-3",
      timestamp: "2026-04-08T10:02:00Z",
      from: "bpsai-prime",
      to: "cc-operator",
      type: "dispatch-result",
      content: JSON.stringify({
        success: false,
        output: "Build failed",
        dispatch_id: "d-456",
        agent: "bpsai-prime",
        repo: "bpsai-iris",
      }),
      severity: "error",
    };
    const result = renderDispatchContent(msg);
    expect(result.summary).toContain("bpsai-prime");
    expect(result.summary).toContain("bpsai-iris");
    expect(result.summary).toMatch(/failed|failure/i);
    expect(result.color).toBe("text-danger");
  });

  it("includes output in detail", () => {
    const msg: FeedMessage = {
      id: "msg-4",
      timestamp: "2026-04-08T10:03:00Z",
      from: "bpsai-prime",
      to: "cc-operator",
      type: "dispatch-result",
      content: JSON.stringify({
        success: true,
        output: "Deployed to staging",
        agent: "bpsai-prime",
        repo: "bpsai-core",
      }),
      severity: "success",
    };
    const result = renderDispatchContent(msg);
    expect(result.detail).toContain("Deployed to staging");
  });

  it("falls back gracefully for non-JSON content", () => {
    const msg: FeedMessage = {
      id: "msg-5",
      timestamp: "2026-04-08T10:04:00Z",
      from: "agent",
      to: "cc",
      type: "dispatch-result",
      content: "raw result text",
      severity: "info",
    };
    const result = renderDispatchContent(msg);
    expect(result.summary).toBe("raw result text");
  });
});

// ---------------------------------------------------------------------------
// renderDispatchContent — dispatch-ack (in-progress)
// ---------------------------------------------------------------------------

describe("renderDispatchContent — dispatch-ack", () => {
  it("shows running state with agent and repo", () => {
    const msg: FeedMessage = {
      id: "msg-6",
      timestamp: "2026-04-08T10:00:30Z",
      from: "bpsai-a2a",
      to: "cc-operator",
      type: "dispatch-ack",
      content: JSON.stringify({
        agent: "bpsai-prime",
        repo: "bpsai-core",
        dispatch_id: "d-123",
      }),
      severity: "info",
    };
    const result = renderDispatchContent(msg);
    expect(result.summary).toMatch(/running|in.progress/i);
    expect(result.summary).toContain("bpsai-prime");
    expect(result.summary).toContain("bpsai-core");
    expect(result.color).toBe("text-warning");
    expect(result.refId).toBe("d-123");
  });

  it("falls back for non-JSON ack", () => {
    const msg: FeedMessage = {
      id: "msg-7",
      timestamp: "2026-04-08T10:00:30Z",
      from: "a2a",
      to: "cc",
      type: "dispatch-ack",
      content: "acknowledged",
      severity: "info",
    };
    const result = renderDispatchContent(msg);
    expect(result.summary).toContain("acknowledged");
  });
});

// ---------------------------------------------------------------------------
// renderDispatchContent — returns null for non-dispatch types
// ---------------------------------------------------------------------------

describe("renderDispatchContent — non-dispatch types", () => {
  it("returns null for regular message types", () => {
    const msg: FeedMessage = {
      id: "msg-8",
      timestamp: "2026-04-08T10:05:00Z",
      from: "agent",
      to: "agent2",
      type: "task_complete",
      content: "Done",
      severity: "success",
    };
    expect(renderDispatchContent(msg)).toBeNull();
  });
});
