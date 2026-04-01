import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the middleware logic extracted into a pure function
// to avoid mocking NextRequest/NextResponse internals directly.

function makeJwt(
  payload: Record<string, unknown>,
  expiresInSec = 1800,
): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { iat: now, exp: now + expiresInSec, ...payload };
  const body = btoa(JSON.stringify(fullPayload));
  return `${header}.${body}.fakesig`;
}

const VALID_CLAIMS = {
  sub: "zoho-123",
  user_id: "zoho:zoho-123",
  display_name: "Alice Smith",
  email: "alice@test.com",
  roles: ["support_staff"],
};

describe("middleware auth decision", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns 'redirect_login' when no access token cookie exists", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/",
      accessToken: null,
      refreshToken: null,
    });
    expect(result.action).toBe("redirect_login");
  });

  it("returns 'allow' with operator when valid non-expired token exists", async () => {
    const token = makeJwt(VALID_CLAIMS, 1800);
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/",
      accessToken: token,
      refreshToken: "rt",
    });
    expect(result.action).toBe("allow");
    expect(result.operator).toBe("Alice Smith");
  });

  it("returns 'refresh' when token is expired but refresh token exists", async () => {
    const token = makeJwt(VALID_CLAIMS, -60); // expired 60s ago
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/",
      accessToken: token,
      refreshToken: "valid-rt",
    });
    expect(result.action).toBe("refresh");
  });

  it("returns 'refresh' when token expires within 2 minutes", async () => {
    const token = makeJwt(VALID_CLAIMS, 90); // expires in 90s < 120s threshold
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/",
      accessToken: token,
      refreshToken: "rt",
    });
    expect(result.action).toBe("refresh");
  });

  it("returns 'redirect_login' when expired and no refresh token", async () => {
    const token = makeJwt(VALID_CLAIMS, -60);
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/",
      accessToken: token,
      refreshToken: null,
    });
    expect(result.action).toBe("redirect_login");
  });

  it("returns 'redirect_login' when token is malformed", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/",
      accessToken: "not-a-jwt",
      refreshToken: "rt",
    });
    expect(result.action).toBe("redirect_login");
  });

  it("skips auth for /login path", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/login",
      accessToken: null,
      refreshToken: null,
    });
    expect(result.action).toBe("skip");
  });

  it("skips auth for /auth/callback path", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/auth/callback",
      accessToken: null,
      refreshToken: null,
    });
    expect(result.action).toBe("skip");
  });

  it("skips auth for /api/health path", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/api/health",
      accessToken: null,
      refreshToken: null,
    });
    expect(result.action).toBe("skip");
  });

  it("uses display_name as operator, falls back to email", async () => {
    const noNameToken = makeJwt({ ...VALID_CLAIMS, display_name: "" }, 1800);
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/",
      accessToken: noNameToken,
      refreshToken: "rt",
    });
    expect(result.operator).toBe("alice@test.com");
  });

  it("uses sub as last-resort operator fallback", async () => {
    const minimalToken = makeJwt(
      { sub: "zoho-123", exp: Math.floor(Date.now() / 1000) + 1800 },
      1800,
    );
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/",
      accessToken: minimalToken,
      refreshToken: "rt",
    });
    expect(result.operator).toBe("zoho-123");
  });
});

describe("PUBLIC_PATHS", () => {
  it("includes login, callback, and health", async () => {
    const { PUBLIC_PATHS } = await import("@/lib/auth-middleware");
    expect(PUBLIC_PATHS).toContain("/login");
    expect(PUBLIC_PATHS).toContain("/auth/callback");
    expect(PUBLIC_PATHS).toContain("/api/health");
  });
});

describe("REFRESH_THRESHOLD_SEC", () => {
  it("is 120 seconds", async () => {
    const { REFRESH_THRESHOLD_SEC } = await import("@/lib/auth-middleware");
    expect(REFRESH_THRESHOLD_SEC).toBe(120);
  });
});
