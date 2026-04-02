/** UAT1.2 — CC Auth Contract Tests */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

function makeJwt(
  claims: Record<string, unknown>,
  expiresInSec = 1800,
): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const full = { iat: now, exp: now + expiresInSec, ...claims };
  const body = btoa(JSON.stringify(full));
  return `${header}.${body}.fakesig`;
}

const PORTAL_CLAIMS = {
  sub: "zoho-456",
  user_id: "zoho:zoho-456",
  display_name: "Bob Operator",
  email: "bob@acme.com",
  org_id: "org-acme-001",
  license_id: "LIC-789",
  operator: "Bob Operator",
  tier: "pro",
};

function portalSessionResponse(claims = PORTAL_CLAIMS, expiresIn = 1800) {
  return {
    ok: true,
    json: async () => ({
      access_token: makeJwt(claims, expiresIn),
      refresh_token: "portal-rt-fresh",
      expires_in: expiresIn,
      token_type: "Bearer",
    }),
  };
}

function portalRefreshResponse(claims = PORTAL_CLAIMS, expiresIn = 1800) {
  return {
    ok: true,
    json: async () => ({
      access_token: makeJwt(claims, expiresIn),
      refresh_token: "portal-rt-refreshed",
      expires_in: expiresIn,
      token_type: "Bearer",
    }),
  };
}

function a2aSessionsResponse(sessions: Record<string, unknown>[] = []) {
  return {
    ok: true,
    json: async () =>
      sessions.length
        ? sessions
        : [
            {
              session_id: "sess-1",
              operator: "Bob Operator",
              org_id: "org-acme-001",
              status: "complete",
            },
          ],
  };
}

describe("contract: callback is POST-only", () => {
  it("callback route exports POST handler, not GET", async () => {
    const route = await import("@/app/api/auth/callback/route");
    expect(typeof route.POST).toBe("function");
    expect((route as Record<string, unknown>).GET).toBeUndefined();
  });
});

describe("contract: cookie settings on callback", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  const cookieJar: Record<string, { value: string; options?: unknown }> = {};

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SUPPORT_API_URL", "https://support.test");
    vi.stubEnv("ZOHO_CLIENT_ID", "test-client-id");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.test");
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    // Mock: token exchange → zoho tokens
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "zoho-at",
        refresh_token: "zoho-rt",
        expires_in: 3600,
        token_type: "Bearer",
      }),
    });
    // Mock: portal session → portal JWT
    fetchSpy.mockResolvedValueOnce(portalSessionResponse());

    vi.doMock("next/headers", () => ({
      cookies: () => ({
        get: (name: string) => {
          if (name === "oauth_state") return { value: "test-state" };
          if (name === "pkce_verifier") return { value: "test-verifier" };
          return undefined;
        },
        set: (name: string, value: string, options?: unknown) => {
          cookieJar[name] = { value, options };
        },
      }),
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    Object.keys(cookieJar).forEach((k) => delete cookieJar[k]);
  });

  it("sets access token as httpOnly cookie with 30min maxAge", async () => {
    const { POST } = await import("@/app/api/auth/callback/route");
    const req = new Request("https://app.test/api/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "auth-code", state: "test-state" }),
    });
    await POST(req as unknown as NextRequest);

    const opts = cookieJar["cc_access_token"]?.options as Record<string, unknown>;
    expect(opts).toBeDefined();
    expect(opts.httpOnly).toBe(true);
    expect(opts.maxAge).toBe(30 * 60); // 1800s = 30min
    expect(opts.path).toBe("/");
  });

  it("sets refresh token as httpOnly cookie with 12hr maxAge", async () => {
    const { POST } = await import("@/app/api/auth/callback/route");
    const req = new Request("https://app.test/api/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "auth-code", state: "test-state" }),
    });
    await POST(req as unknown as NextRequest);

    const opts = cookieJar["cc_refresh_token"]?.options as Record<string, unknown>;
    expect(opts).toBeDefined();
    expect(opts.httpOnly).toBe(true);
    expect(opts.maxAge).toBe(12 * 60 * 60); // 43200s = 12hr
    expect(opts.path).toBe("/");
  });

  it("access and refresh tokens stored in separate cookies", async () => {
    const { POST } = await import("@/app/api/auth/callback/route");
    const req = new Request("https://app.test/api/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "auth-code", state: "test-state" }),
    });
    await POST(req as unknown as NextRequest);

    expect(cookieJar["cc_access_token"]).toBeDefined();
    expect(cookieJar["cc_refresh_token"]).toBeDefined();
    expect(cookieJar["cc_access_token"].value).not.toBe(
      cookieJar["cc_refresh_token"].value,
    );
  });
});

describe("contract: middleware auto-refresh", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("triggers refresh when token expires within 120s", async () => {
    const token = makeJwt(PORTAL_CLAIMS, 90); // 90s < 120s threshold
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/dashboard",
      accessToken: token,
      refreshToken: "rt-valid",
    });
    expect(result.action).toBe("refresh");
  });

  it("allows through when token has >120s remaining", async () => {
    const token = makeJwt(PORTAL_CLAIMS, 300); // 300s > 120s
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/dashboard",
      accessToken: token,
      refreshToken: "rt-valid",
    });
    expect(result.action).toBe("allow");
  });

  it("threshold boundary: exactly 120s triggers refresh", async () => {
    const token = makeJwt(PORTAL_CLAIMS, 120); // exactly at threshold
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/dashboard",
      accessToken: token,
      refreshToken: "rt",
    });
    expect(result.action).toBe("refresh");
  });

  it("threshold boundary: 121s allows through", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const token = makeJwt(PORTAL_CLAIMS, 121);
    const result = evaluateAuth({
      pathname: "/dashboard",
      accessToken: token,
      refreshToken: "rt",
    });
    expect(result.action).toBe("allow");
  });
});

describe("contract: proxy routes forward Bearer token", () => {
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

  function makeProxyReq(
    url: string,
    opts?: { operator?: string; jwt?: string; method?: string; body?: string },
  ): NextRequest {
    const headers: Record<string, string> = {};
    if (opts?.operator) headers["x-operator"] = opts.operator;
    if (opts?.jwt) headers["cookie"] = `cc_access_token=${opts.jwt}`;
    if (opts?.body) headers["content-type"] = "application/json";
    return new NextRequest(url, {
      method: opts?.method ?? "GET",
      headers,
      ...(opts?.body ? { body: opts.body } : {}),
    });
  }

  const proxyRoutes = [
    { name: "agents", path: "api/agents", import: "../src/app/api/agents/route", method: "GET" },
    { name: "sessions", path: "api/sessions", import: "../src/app/api/sessions/route", method: "GET" },
    { name: "ack", path: "api/ack", import: "../src/app/api/ack/route", method: "POST" },
  ];

  for (const route of proxyRoutes) {
    it(`${route.name}: forwards Bearer token to A2A`, async () => {
      fetchSpy.mockResolvedValue({ ok: true, json: async () => ({}) });

      const mod = await import(route.import);
      const handler = mod[route.method];
      const req = makeProxyReq(`http://localhost/${route.path}`, {
        operator: "alice",
        jwt: "contract-jwt-xyz",
        method: route.method,
        ...(route.method === "POST" ? { body: JSON.stringify({ message_id: "m1" }) } : {}),
      });
      await handler(req);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer contract-jwt-xyz",
          }),
        }),
      );
    });
  }
});

describe("contract: sessions scoped by server-set operator", () => {
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

  it("uses x-operator header (from middleware/JWT), not client query param", async () => {
    fetchSpy.mockResolvedValueOnce(a2aSessionsResponse());

    const { GET } = await import("../src/app/api/sessions/route");
    // Client tries to pass operator=evil in query params
    const req = new NextRequest(
      "http://localhost/api/sessions?operator=evil-user",
      {
        headers: {
          "x-operator": "Bob Operator",
          cookie: "cc_access_token=jwt-tok",
        },
      },
    );
    await GET(req);

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    const url = new URL(calledUrl);
    // Upstream should get operator from header, not the query param
    expect(url.searchParams.get("operator")).toBe("Bob Operator");
    expect(url.searchParams.get("operator")).not.toBe("evil-user");
  });
});

describe("contract: resume ownership check", () => {
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

  it("returns 403 when operator does not match session owner", async () => {
    // A2A returns session owned by "Alice"
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        session_id: "sess-1",
        operator: "Alice",
        status: "complete",
      }),
    });

    const { POST } = await import(
      "../src/app/api/sessions/[session_id]/resume/route"
    );
    const req = new NextRequest("http://localhost/api/sessions/sess-1/resume", {
      method: "POST",
      headers: {
        "x-operator": "Bob",
        cookie: "cc_access_token=some-jwt",
      },
    });
    const res = await POST(req, {
      params: Promise.resolve({ session_id: "sess-1" }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/another operator/i);
  });

  it("allows resume when operator matches session owner", async () => {
    // A2A returns session owned by "Alice" — same operator
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        session_id: "sess-1",
        operator: "Alice",
        status: "complete",
      }),
    });
    // Dispatch succeeds
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ dispatched: true }),
    });

    const { POST } = await import(
      "../src/app/api/sessions/[session_id]/resume/route"
    );
    const req = new NextRequest("http://localhost/api/sessions/sess-1/resume", {
      method: "POST",
      headers: {
        "x-operator": "Alice",
        cookie: "cc_access_token=some-jwt",
      },
    });
    const res = await POST(req, {
      params: Promise.resolve({ session_id: "sess-1" }),
    });

    expect(res.status).toBe(200);
  });
});

describe("contract: license_id absence sets cc_has_license=0", () => {
  it("hasLicenseInJwt returns false when license_id is absent", async () => {
    const { hasLicenseInJwt } = await import("@/lib/license");
    const jwt = makeJwt({ sub: "u1", display_name: "Test" }, 1800);
    expect(hasLicenseInJwt(jwt)).toBe(false);
  });

  it("hasLicenseInJwt returns true when license_id is present", async () => {
    const { hasLicenseInJwt } = await import("@/lib/license");
    const jwt = makeJwt(PORTAL_CLAIMS, 1800); // has license_id: "LIC-789"
    expect(hasLicenseInJwt(jwt)).toBe(true);
  });

  it("hasLicenseInJwt returns false for empty string license_id", async () => {
    const { hasLicenseInJwt } = await import("@/lib/license");
    const jwt = makeJwt({ ...PORTAL_CLAIMS, license_id: "" }, 1800);
    expect(hasLicenseInJwt(jwt)).toBe(false);
  });
});

describe("contract: license link uses raw portal JWT", () => {
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

  it("sends Authorization: Bearer with portal JWT (sub is raw, not zoho: prefixed)", async () => {
    // The portal JWT contains sub: "zoho-456" (raw), not "zoho:zoho-456"
    const jwt = makeJwt({ sub: "zoho-456", display_name: "Bob" }, 1800);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ linked: true, license_id: "LIC-NEW" }),
    });

    const { linkLicense } = await import("@/lib/license");
    await linkLicense(jwt, "PCKEY-test");

    // Verify the raw JWT is forwarded, not a reconstructed user_id
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://support.test/users/me/license");
    expect(opts.headers.Authorization).toBe(`Bearer ${jwt}`);

    // Verify the JWT payload sub claim is the raw zoho sub
    const { parseJwtClaims } = await import("@/lib/oauth");
    const claims = parseJwtClaims(jwt);
    expect(claims?.sub).toBe("zoho-456");
    // Should NOT be prefixed
    expect(claims?.sub).not.toMatch(/^zoho:/);
  });
});

describe("contract: unauthenticated → redirect to /login", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.resetModules());

  it("redirects to /login when no access token", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/dashboard",
      accessToken: null,
      refreshToken: null,
    });
    expect(result.action).toBe("redirect_login");
  });

  it("redirects to /login for API routes without token", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/api/sessions",
      accessToken: null,
      refreshToken: null,
    });
    expect(result.action).toBe("redirect_login");
  });

  it("redirects to /login for malformed JWT", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/",
      accessToken: "garbage-not-jwt",
      refreshToken: null,
    });
    expect(result.action).toBe("redirect_login");
  });
});

describe("contract: auth routes are public", () => {
  it("PUBLIC_PATHS includes all three auth API routes", async () => {
    const { PUBLIC_PATHS } = await import("@/lib/auth-middleware");
    expect(PUBLIC_PATHS).toContain("/api/auth/login");
    expect(PUBLIC_PATHS).toContain("/api/auth/callback");
    expect(PUBLIC_PATHS).toContain("/api/auth/logout");
  });

  it("evaluateAuth skips auth for /api/auth/login", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    expect(
      evaluateAuth({ pathname: "/api/auth/login", accessToken: null, refreshToken: null }),
    ).toEqual({ action: "skip" });
  });

  it("evaluateAuth skips auth for /api/auth/callback", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    expect(
      evaluateAuth({ pathname: "/api/auth/callback", accessToken: null, refreshToken: null }),
    ).toEqual({ action: "skip" });
  });

  it("evaluateAuth skips auth for /api/auth/logout", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    expect(
      evaluateAuth({ pathname: "/api/auth/logout", accessToken: null, refreshToken: null }),
    ).toEqual({ action: "skip" });
  });
});

describe("contract: portal-session fixture shape", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SUPPORT_API_URL", "https://support.test");
    vi.stubEnv("ZOHO_CLIENT_ID", "test-client-id");
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("exchangeForPortalSession posts to /auth/portal-session", async () => {
    fetchSpy.mockResolvedValueOnce(portalSessionResponse());
    const { exchangeForPortalSession } = await import("@/lib/oauth");
    const result = await exchangeForPortalSession("zoho-token-abc");

    expect(fetchSpy.mock.calls[0][0]).toBe(
      "https://support.test/auth/portal-session",
    );
    expect(result.access_token).toBeTruthy();
    expect(result.refresh_token).toBe("portal-rt-fresh");

    // Verify JWT claims in the access_token
    const { parseJwtClaims } = await import("@/lib/oauth");
    const claims = parseJwtClaims(result.access_token);
    expect(claims?.org_id).toBe("org-acme-001");
    expect(claims?.license_id).toBe("LIC-789");
    expect(claims?.display_name).toBe("Bob Operator");
    expect(claims?.tier).toBe("pro");
  });

  it("refreshPortalSession posts to /auth/portal-refresh", async () => {
    fetchSpy.mockResolvedValueOnce(portalRefreshResponse());
    const { refreshPortalSession } = await import("@/lib/oauth");
    const result = await refreshPortalSession("rt-to-refresh");

    expect(fetchSpy.mock.calls[0][0]).toBe(
      "https://support.test/auth/portal-refresh",
    );
    expect(result.access_token).toBeTruthy();
    expect(result.refresh_token).toBe("portal-rt-refreshed");
  });
});
