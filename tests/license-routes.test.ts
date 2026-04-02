import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Helper: build a fake JWT with given claims
function fakeJwt(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify(claims));
  return `${header}.${payload}.fake-sig`;
}

// ---------------------------------------------------------------------------
// POST /api/license/link
// ---------------------------------------------------------------------------
describe("license link route", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SUPPORT_API_URL", "https://support.test");
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("proxies license link to bpsai-support with JWT from cookie", async () => {
    const jwt = fakeJwt({
      sub: "user1",
      display_name: "Alice",
      email: "alice@test.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ linked: true, license_id: "LIC-123" }),
    });

    // Dynamic import to pick up env stubs
    const { POST } = await import("@/app/api/license/link/route");

    const request = new Request("http://localhost:3000/api/license/link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `cc_access_token=${jwt}`,
      },
      body: JSON.stringify({ license_key: "PCKEY-abc" }),
    });
    // Attach cookies via header — in Next.js the cookies() helper reads from
    // the request. We mock cookies() below.
    vi.doMock("next/headers", () => ({
      cookies: () => ({
        get: (name: string) => {
          if (name === "cc_access_token") return { value: jwt };
          return undefined;
        },
      }),
    }));

    // Re-import after mock
    vi.resetModules();
    const route = await import("@/app/api/license/link/route");
    const response = await route.POST(request);
    const body = await response.json();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://support.test/users/me/license",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: `Bearer ${jwt}`,
        }),
      }),
    );
    expect(body).toEqual({ linked: true, license_id: "LIC-123" });
  });

  it("returns 401 when no access token cookie", async () => {
    vi.doMock("next/headers", () => ({
      cookies: () => ({
        get: () => undefined,
      }),
    }));
    vi.resetModules();

    const { POST } = await import("@/app/api/license/link/route");
    const request = new Request("http://localhost:3000/api/license/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: "KEY" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 when license_key is missing from body", async () => {
    const jwt = fakeJwt({ sub: "u1", exp: 9999999999 });
    vi.doMock("next/headers", () => ({
      cookies: () => ({
        get: (name: string) => {
          if (name === "cc_access_token") return { value: jwt };
          return undefined;
        },
      }),
    }));
    vi.resetModules();

    const { POST } = await import("@/app/api/license/link/route");
    const request = new Request("http://localhost:3000/api/license/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("forwards upstream error responses", async () => {
    const jwt = fakeJwt({ sub: "u1", exp: 9999999999 });
    vi.doMock("next/headers", () => ({
      cookies: () => ({
        get: (name: string) => {
          if (name === "cc_access_token") return { value: jwt };
          return undefined;
        },
      }),
    }));
    vi.resetModules();
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "License already linked" }),
    });

    const { POST } = await import("@/app/api/license/link/route");
    const request = new Request("http://localhost:3000/api/license/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: "USED-KEY" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("License already linked");
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh-session
// ---------------------------------------------------------------------------
describe("refresh-session route", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SUPPORT_API_URL", "https://support.test");
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("refreshes session and sets updated cookies", async () => {
    const refreshToken = "rt-abc";
    const newJwt = fakeJwt({
      sub: "user1",
      display_name: "Alice",
      email: "alice@test.com",
      license_id: "LIC-123",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const cookieJar: Record<string, { value: string; options?: unknown }> = {};
    vi.doMock("next/headers", () => ({
      cookies: () => ({
        get: (name: string) => {
          if (name === "cc_refresh_token") return { value: refreshToken };
          return undefined;
        },
        set: (name: string, value: string, options?: unknown) => {
          cookieJar[name] = { value, options };
        },
      }),
    }));

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: newJwt,
        refresh_token: "rt-new",
        expires_in: 1800,
        token_type: "Bearer",
      }),
    });

    vi.resetModules();
    const { POST } = await import("@/app/api/auth/refresh-session/route");
    const request = new Request(
      "http://localhost:3000/api/auth/refresh-session",
      { method: "POST" },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.refreshed).toBe(true);
    expect(body.hasLicense).toBe(true);

    // Verify cookies were set
    expect(cookieJar["cc_access_token"]?.value).toBe(newJwt);
    expect(cookieJar["cc_refresh_token"]?.value).toBe("rt-new");
    expect(cookieJar["cc_has_license"]?.value).toBe("1");
  });

  it("returns 401 when no refresh token", async () => {
    vi.doMock("next/headers", () => ({
      cookies: () => ({
        get: () => undefined,
        set: vi.fn(),
      }),
    }));
    vi.resetModules();

    const { POST } = await import("@/app/api/auth/refresh-session/route");
    const request = new Request(
      "http://localhost:3000/api/auth/refresh-session",
      { method: "POST" },
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 502 when upstream refresh fails", async () => {
    vi.doMock("next/headers", () => ({
      cookies: () => ({
        get: (name: string) => {
          if (name === "cc_refresh_token") return { value: "rt-abc" };
          return undefined;
        },
        set: vi.fn(),
      }),
    }));

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    vi.resetModules();
    const { POST } = await import("@/app/api/auth/refresh-session/route");
    const request = new Request(
      "http://localhost:3000/api/auth/refresh-session",
      { method: "POST" },
    );

    const response = await POST(request);
    expect(response.status).toBe(502);
  });
});
