import { describe, it, expect } from "vitest";
import { mapSeverity, mapRawMessage, type FeedMessage } from "../src/app/lib/feed";

describe("mapSeverity", () => {
  it("maps critical to error", () => {
    expect(mapSeverity("critical")).toBe("error");
  });

  it("maps high to error", () => {
    expect(mapSeverity("high")).toBe("error");
  });

  it("maps medium to warning", () => {
    expect(mapSeverity("medium")).toBe("warning");
  });

  it("maps low to success", () => {
    expect(mapSeverity("low")).toBe("success");
  });

  it("maps unknown values to info", () => {
    expect(mapSeverity("unknown")).toBe("info");
  });

  it("maps empty string to info", () => {
    expect(mapSeverity("")).toBe("info");
  });
});

describe("mapRawMessage", () => {
  const raw: Record<string, string> = {
    id: "msg-001",
    created_at: "2026-03-31T10:00:00Z",
    from_project: "bpsai-agents",
    to_project: "bpsai-iris",
    type: "task_complete",
    content: "Task finished",
    severity: "low",
  };

  it("maps id from raw id", () => {
    expect(mapRawMessage(raw).id).toBe("msg-001");
  });

  it("maps timestamp from created_at", () => {
    expect(mapRawMessage(raw).timestamp).toBe("2026-03-31T10:00:00Z");
  });

  it("maps from from from_project", () => {
    expect(mapRawMessage(raw).from).toBe("bpsai-agents");
  });

  it("maps to from to_project", () => {
    expect(mapRawMessage(raw).to).toBe("bpsai-iris");
  });

  it("maps type directly", () => {
    expect(mapRawMessage(raw).type).toBe("task_complete");
  });

  it("maps content directly", () => {
    expect(mapRawMessage(raw).content).toBe("Task finished");
  });

  it("maps severity through mapSeverity", () => {
    expect(mapRawMessage(raw).severity).toBe("success"); // low -> success
  });

  it("sets project from from_project", () => {
    expect(mapRawMessage(raw).project).toBe("bpsai-agents");
  });

  it("maps critical severity correctly", () => {
    const critical = { ...raw, severity: "critical" };
    expect(mapRawMessage(critical).severity).toBe("error");
  });
});
