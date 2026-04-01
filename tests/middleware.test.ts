import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// These tests cover the evaluateAuth function which is the core logic
// of the new OAuth middleware. Integration-level middleware behavior
// (cookie reading, redirect responses) is tested indirectly through
// the auth-middleware tests. Here we add supplementary coverage.

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

const CLAIMS = {
  sub: "zoho-456",
  display_name: "Bob Jones",
  email: "bob@test.com",
  roles: ["admin"],
};

describe("OAuth middleware — evaluateAuth edge cases", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("allows request with long-lived token (no refresh needed)", async () => {
    const token = makeJwt(CLAIMS, 600); // 10min > 2min threshold
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const r = evaluateAuth({
      pathname: "/",
      accessToken: token,
      refreshToken: "rt",
    });
    expect(r.action).toBe("allow");
    if (r.action === "allow") expect(r.operator).toBe("Bob Jones");
  });

  it("redirects for expired token with no refresh token", async () => {
    const token = makeJwt(CLAIMS, -300);
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const r = evaluateAuth({
      pathname: "/api/sessions",
      accessToken: token,
      refreshToken: null,
    });
    expect(r.action).toBe("redirect_login");
  });

  it("skips auth for paths starting with /login", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const r = evaluateAuth({
      pathname: "/login?error=foo",
      accessToken: null,
      refreshToken: null,
    });
    expect(r.action).toBe("skip");
  });

  it("does not skip auth for /api/sessions (not public)", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const r = evaluateAuth({
      pathname: "/api/sessions",
      accessToken: null,
      refreshToken: null,
    });
    expect(r.action).toBe("redirect_login");
  });

  it("handles token at exactly the refresh threshold boundary", async () => {
    const token = makeJwt(CLAIMS, 120); // exactly 120s = threshold
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const r = evaluateAuth({
      pathname: "/",
      accessToken: token,
      refreshToken: "rt",
    });
    // At exactly threshold, should still trigger refresh (<=)
    expect(r.action).toBe("refresh");
  });

  it("handles token at threshold + 1 (no refresh needed)", async () => {
    const token = makeJwt(CLAIMS, 121);
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const r = evaluateAuth({
      pathname: "/",
      accessToken: token,
      refreshToken: "rt",
    });
    expect(r.action).toBe("allow");
  });
});

describe("OAuth middleware — cookie constants", () => {
  it("uses correct cookie names", async () => {
    const { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } = await import(
      "@/lib/oauth"
    );
    expect(ACCESS_TOKEN_COOKIE).toBe("cc_access_token");
    expect(REFRESH_TOKEN_COOKIE).toBe("cc_refresh_token");
  });
});
