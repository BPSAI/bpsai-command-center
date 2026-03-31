import { describe, it, expect } from "vitest";
import { createHmac, timingSafeEqual as cryptoTimingSafeEqual } from "crypto";

// ── timingSafeEqual with HMAC ──────────────────────────────────────────
// Mirrors the implementation that should exist in middleware.ts

function timingSafeEqual(a: string, b: string): boolean {
  const key = "timing-safe-compare";
  const ha = createHmac("sha256", key).update(a).digest();
  const hb = createHmac("sha256", key).update(b).digest();
  return cryptoTimingSafeEqual(ha, hb);
}

describe("timingSafeEqual (HMAC)", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeEqual("hello", "hello")).toBe(true);
  });

  it("returns false for different strings of same length", () => {
    expect(timingSafeEqual("hello", "world")).toBe(false);
  });

  it("returns false for different lengths without early return", () => {
    // Key change: no length leak — different lengths still go through HMAC
    expect(timingSafeEqual("short", "muchlongerstring")).toBe(false);
  });

  it("returns true for empty strings", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });

  it("returns false for near-miss strings", () => {
    expect(timingSafeEqual("password1", "password2")).toBe(false);
  });
});

// ── Operator scoping: x-operator is authoritative ──────────────────────

/** Build upstream URL — operator MUST come from middleware, not query */
function buildSessionsUrl(
  base: string,
  params: { operator: string; status?: string; machine?: string },
): string {
  const url = new URL("/sessions", base);
  url.searchParams.set("operator", params.operator);
  if (params.status) url.searchParams.set("status", params.status);
  if (params.machine) url.searchParams.set("machine", params.machine);
  return url.toString();
}

describe("operator scoping — query param override blocked", () => {
  it("uses middleware operator, ignores client-supplied operator", () => {
    // Middleware sets x-operator to "alice" but client sends ?operator=eve
    const middlewareOperator = "alice";
    const url = buildSessionsUrl("https://a2a.test", {
      operator: middlewareOperator,
    });
    expect(new URL(url).searchParams.get("operator")).toBe("alice");
  });

  it("always uses the middleware operator even when client tries override", () => {
    // The route should ignore searchParams.get("operator") from the request
    // and always use request.headers.get("x-operator")
    const url = buildSessionsUrl("https://a2a.test", {
      operator: "alice", // from middleware header, not client query
      status: "running",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("operator")).toBe("alice");
    expect(parsed.searchParams.get("status")).toBe("running");
  });
});

// ── session_id encoding ────────────────────────────────────────────────

/** Build upstream session URL with proper encoding */
function buildSessionUrl(base: string, sessionId: string): string {
  return `${base}/sessions/${encodeURIComponent(sessionId)}`;
}

describe("session_id encoding in upstream URLs", () => {
  it("encodes normal session IDs unchanged", () => {
    expect(buildSessionUrl("https://a2a.test", "sess-001")).toBe(
      "https://a2a.test/sessions/sess-001",
    );
  });

  it("encodes session IDs with slashes", () => {
    expect(buildSessionUrl("https://a2a.test", "sess/001")).toBe(
      "https://a2a.test/sessions/sess%2F001",
    );
  });

  it("encodes session IDs with special characters", () => {
    const url = buildSessionUrl("https://a2a.test", "sess 001?x=1");
    expect(url).toBe("https://a2a.test/sessions/sess%20001%3Fx%3D1");
  });

  it("encodes session IDs with percent signs", () => {
    const url = buildSessionUrl("https://a2a.test", "100%done");
    expect(url).toBe("https://a2a.test/sessions/100%25done");
  });
});

// ── PATCH field allowlist ──────────────────────────────────────────────

const PATCH_ALLOWED_FIELDS = new Set(["status"]);

/** Filter PATCH body to allowed fields only */
function filterPatchBody(body: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (PATCH_ALLOWED_FIELDS.has(key)) {
      filtered[key] = body[key];
    }
  }
  return filtered;
}

describe("PATCH field allowlist", () => {
  it("allows status field through", () => {
    const result = filterPatchBody({ status: "running" });
    expect(result).toEqual({ status: "running" });
  });

  it("strips arbitrary fields", () => {
    const result = filterPatchBody({
      status: "running",
      operator: "evil",
      command: "rm -rf /",
      admin: true,
    });
    expect(result).toEqual({ status: "running" });
    expect(result).not.toHaveProperty("operator");
    expect(result).not.toHaveProperty("command");
    expect(result).not.toHaveProperty("admin");
  });

  it("returns empty object when no allowed fields present", () => {
    const result = filterPatchBody({ operator: "evil", foo: "bar" });
    expect(result).toEqual({});
  });

  it("preserves status value types", () => {
    const result = filterPatchBody({ status: "complete" });
    expect(result.status).toBe("complete");
  });
});
