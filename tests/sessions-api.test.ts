import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Test the pure logic extracted from the sessions API route

const A2A_BASE_URL = "https://a2a.test";

interface SessionsParams {
  operator?: string;
  status?: string;
  machine?: string;
}

/** Build upstream URL for GET /sessions with query filters */
function buildSessionsUrl(base: string, params: SessionsParams): string {
  const url = new URL("/sessions", base);
  if (params.operator) url.searchParams.set("operator", params.operator);
  if (params.status) url.searchParams.set("status", params.status);
  if (params.machine) url.searchParams.set("machine", params.machine);
  return url.toString();
}

/** Validate session status for PATCH */
function isValidStatus(status: string): boolean {
  return ["started", "running", "complete", "failed"].includes(status);
}

/** Validate PATCH body */
function validatePatchBody(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Body must be a JSON object" };
  }
  const obj = body as Record<string, unknown>;
  if (obj.status !== undefined) {
    if (typeof obj.status !== "string" || !isValidStatus(obj.status)) {
      return { valid: false, error: "Invalid status value" };
    }
  }
  return { valid: true };
}

describe("buildSessionsUrl", () => {
  it("builds base URL with no filters", () => {
    const url = buildSessionsUrl(A2A_BASE_URL, {});
    expect(url).toBe("https://a2a.test/sessions");
  });

  it("adds operator filter", () => {
    const url = buildSessionsUrl(A2A_BASE_URL, { operator: "alice" });
    expect(url).toBe("https://a2a.test/sessions?operator=alice");
  });

  it("adds status filter", () => {
    const url = buildSessionsUrl(A2A_BASE_URL, { status: "running" });
    expect(url).toBe("https://a2a.test/sessions?status=running");
  });

  it("adds machine filter", () => {
    const url = buildSessionsUrl(A2A_BASE_URL, { machine: "srv-01" });
    expect(url).toBe("https://a2a.test/sessions?machine=srv-01");
  });

  it("combines all filters", () => {
    const url = buildSessionsUrl(A2A_BASE_URL, {
      operator: "alice",
      status: "complete",
      machine: "srv-02",
    });
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/sessions");
    expect(parsed.searchParams.get("operator")).toBe("alice");
    expect(parsed.searchParams.get("status")).toBe("complete");
    expect(parsed.searchParams.get("machine")).toBe("srv-02");
  });

  it("skips undefined params", () => {
    const url = buildSessionsUrl(A2A_BASE_URL, {
      operator: "bob",
      status: undefined,
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.has("operator")).toBe(true);
    expect(parsed.searchParams.has("status")).toBe(false);
  });
});

describe("isValidStatus", () => {
  it("accepts started", () => expect(isValidStatus("started")).toBe(true));
  it("accepts running", () => expect(isValidStatus("running")).toBe(true));
  it("accepts complete", () => expect(isValidStatus("complete")).toBe(true));
  it("accepts failed", () => expect(isValidStatus("failed")).toBe(true));
  it("rejects unknown", () => expect(isValidStatus("pending")).toBe(false));
  it("rejects empty", () => expect(isValidStatus("")).toBe(false));
});

describe("validatePatchBody", () => {
  it("accepts valid status", () => {
    expect(validatePatchBody({ status: "running" })).toEqual({ valid: true });
  });

  it("accepts body without status (other fields)", () => {
    expect(validatePatchBody({ output: "done" })).toEqual({ valid: true });
  });

  it("rejects null body", () => {
    expect(validatePatchBody(null).valid).toBe(false);
  });

  it("rejects non-object body", () => {
    expect(validatePatchBody("string").valid).toBe(false);
  });

  it("rejects invalid status value", () => {
    const result = validatePatchBody({ status: "invalid" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid status value");
  });

  it("rejects non-string status", () => {
    const result = validatePatchBody({ status: 123 });
    expect(result.valid).toBe(false);
  });
});
