import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Tests that A2A proxy routes:
 * 1. Read portal JWT from cc_access_token cookie
 * 2. Forward as Authorization: Bearer header to A2A
 * 3. Return 401 when cookie missing in production
 * 4. Allow dev fallback (no cookie, NODE_ENV !== production)
 */

const ORIGINAL_ENV = process.env;
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV, A2A_BASE_URL: "https://a2a.test" };
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function makeRequest(
  url: string,
  opts?: { operator?: string; jwt?: string; method?: string },
): NextRequest {
  const headers: Record<string, string> = {};
  if (opts?.operator) headers["x-operator"] = opts.operator;
  if (opts?.jwt) headers["cookie"] = `cc_access_token=${opts.jwt}`;
  return new NextRequest(url, { method: opts?.method ?? "GET", headers });
}

describe("agents route — portal JWT proxy", () => {
  it("forwards portal JWT as Authorization Bearer to A2A", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ agents: [] }),
    });

    const { GET } = await import("../src/app/api/agents/route");
    const req = makeRequest("http://localhost/api/agents", {
      operator: "alice",
      jwt: "portal-jwt-token-xyz",
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://a2a.test/agents/status",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-operator": "alice",
          Authorization: "Bearer portal-jwt-token-xyz",
        }),
      }),
    );
  });

  it("returns 401 when cookie missing in production", async () => {
    process.env.NODE_ENV = "production";

    const { GET } = await import("../src/app/api/agents/route");
    const req = makeRequest("http://localhost/api/agents", {
      operator: "alice",
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/[Uu]nauthorized/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("allows dev fallback — proceeds without Bearer when no cookie in non-production", async () => {
    process.env.NODE_ENV = "development";
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ agents: [] }),
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { GET } = await import("../src/app/api/agents/route");
    const req = makeRequest("http://localhost/api/agents", {
      operator: "bob",
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://a2a.test/agents/status",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-operator": "bob" }),
      }),
    );
    // Should NOT have Authorization header
    const callHeaders = fetchSpy.mock.calls[0][1].headers;
    expect(callHeaders).not.toHaveProperty("Authorization");

    warnSpy.mockRestore();
  });
});

describe("feed route — portal JWT proxy", () => {
  it("forwards portal JWT as Authorization Bearer", async () => {
    // feed route uses SSE stream, so we test the fetch call inside the poll
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    const { GET } = await import("../src/app/api/feed/route");
    const req = makeRequest("http://localhost/api/feed", {
      operator: "alice",
      jwt: "feed-jwt-token",
    });
    const res = await GET(req);

    // Wait a tick for the initial poll to fire
    await new Promise((r) => setTimeout(r, 50));

    // Cancel the stream to stop polling
    await res.body?.cancel();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://a2a.test/messages/feed",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer feed-jwt-token",
        }),
      }),
    );
  });

  it("returns 401 when cookie missing in production", async () => {
    process.env.NODE_ENV = "production";

    const { GET } = await import("../src/app/api/feed/route");
    const req = makeRequest("http://localhost/api/feed", {
      operator: "alice",
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});

describe("ack route — portal JWT proxy", () => {
  it("forwards portal JWT as Authorization Bearer", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const { POST } = await import("../src/app/api/ack/route");
    const req = new NextRequest("http://localhost/api/ack", {
      method: "POST",
      headers: {
        "x-operator": "alice",
        cookie: "cc_access_token=ack-jwt-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ message_id: "msg-1" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://a2a.test/messages/ack",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ack-jwt-token",
        }),
      }),
    );
  });
});

describe("sessions route — portal JWT proxy", () => {
  it("forwards portal JWT as Authorization Bearer", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    });

    const { GET } = await import("../src/app/api/sessions/route");
    const req = makeRequest("http://localhost/api/sessions", {
      operator: "alice",
      jwt: "sessions-jwt",
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/sessions"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sessions-jwt",
        }),
      }),
    );
  });
});
