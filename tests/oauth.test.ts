import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------- PKCE helpers ----------
describe("PKCE helpers", () => {
  it("generateCodeVerifier returns a 43–128 char URL-safe string", async () => {
    const { generateCodeVerifier } = await import("@/lib/oauth");
    const v = generateCodeVerifier();
    expect(v.length).toBeGreaterThanOrEqual(43);
    expect(v.length).toBeLessThanOrEqual(128);
    expect(v).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generateCodeChallenge returns base64url SHA-256 of verifier", async () => {
    const { generateCodeChallenge } = await import("@/lib/oauth");
    // Known test vector: verifier "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
    // SHA-256 → base64url "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    const challenge = await generateCodeChallenge(
      "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
    );
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("two consecutive verifiers are different", async () => {
    const { generateCodeVerifier } = await import("@/lib/oauth");
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier());
  });
});

// ---------- buildZohoAuthUrl ----------
describe("buildZohoAuthUrl", () => {
  beforeEach(() => {
    vi.stubEnv("ZOHO_CLIENT_ID", "test-client-id");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds correct Zoho OAuth URL with PKCE params", async () => {
    const { buildZohoAuthUrl } = await import("@/lib/oauth");
    const url = buildZohoAuthUrl({
      codeChallenge: "test-challenge",
      state: "test-state",
      redirectUri: "http://localhost:3000/auth/callback",
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://accounts.zoho.com");
    expect(parsed.pathname).toBe("/oauth/v2/auth");
    expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/auth/callback",
    );
    expect(parsed.searchParams.get("code_challenge")).toBe("test-challenge");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
    expect(parsed.searchParams.get("state")).toBe("test-state");
    expect(parsed.searchParams.get("scope")).toContain("openid");
  });
});

// ---------- exchangeCodeForTokens ----------
describe("exchangeCodeForTokens", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("SUPPORT_API_URL", "https://support.test");
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("exchanges auth code for Zoho tokens via bpsai-support", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "zoho-at",
        refresh_token: "zoho-rt",
        id_token: "zoho-id",
        expires_in: 3600,
        token_type: "Bearer",
      }),
    });

    const { exchangeCodeForTokens } = await import("@/lib/oauth");
    const tokens = await exchangeCodeForTokens({
      code: "auth-code-123",
      codeVerifier: "verifier-abc",
      redirectUri: "http://localhost:3000/auth/callback",
    });

    expect(tokens).toEqual({
      access_token: "zoho-at",
      refresh_token: "zoho-rt",
      id_token: "zoho-id",
      expires_in: 3600,
      token_type: "Bearer",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://support.test/auth/token",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "auth-code-123",
          code_verifier: "verifier-abc",
          redirect_uri: "http://localhost:3000/auth/callback",
        }),
      }),
    );
  });

  it("throws on non-ok response", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Bad Request",
    });
    const { exchangeCodeForTokens } = await import("@/lib/oauth");
    await expect(
      exchangeCodeForTokens({
        code: "bad",
        codeVerifier: "v",
        redirectUri: "http://localhost:3000/auth/callback",
      }),
    ).rejects.toThrow("Token exchange failed");
  });
});

// ---------- exchangeForPortalSession ----------
describe("exchangeForPortalSession", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("SUPPORT_API_URL", "https://support.test");
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("exchanges Zoho token for portal JWT session", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "portal-jwt-at",
        refresh_token: "portal-jwt-rt",
        expires_in: 1800,
        token_type: "Bearer",
      }),
    });

    const { exchangeForPortalSession } = await import("@/lib/oauth");
    const session = await exchangeForPortalSession("zoho-access-token");

    expect(session).toEqual({
      access_token: "portal-jwt-at",
      refresh_token: "portal-jwt-rt",
      expires_in: 1800,
      token_type: "Bearer",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://support.test/auth/portal-session",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoho_token: "zoho-access-token" }),
      }),
    );
  });

  it("throws on 401 (invalid Zoho token)", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Invalid token",
    });
    const { exchangeForPortalSession } = await import("@/lib/oauth");
    await expect(exchangeForPortalSession("bad-token")).rejects.toThrow(
      "Portal session failed",
    );
  });
});

// ---------- refreshPortalSession ----------
describe("refreshPortalSession", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("SUPPORT_API_URL", "https://support.test");
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("refreshes portal tokens via /auth/portal-refresh", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "new-at",
        refresh_token: "new-rt",
        expires_in: 1800,
        token_type: "Bearer",
      }),
    });

    const { refreshPortalSession } = await import("@/lib/oauth");
    const result = await refreshPortalSession("old-refresh-token");

    expect(result.access_token).toBe("new-at");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://support.test/auth/portal-refresh",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refresh_token: "old-refresh-token" }),
      }),
    );
  });

  it("throws on failed refresh", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Expired",
    });
    const { refreshPortalSession } = await import("@/lib/oauth");
    await expect(refreshPortalSession("expired-rt")).rejects.toThrow(
      "Portal refresh failed",
    );
  });
});

// ---------- revokePortalSession ----------
describe("revokePortalSession", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("SUPPORT_API_URL", "https://support.test");
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("calls /auth/portal-revoke with refresh token", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 204 });

    const { revokePortalSession } = await import("@/lib/oauth");
    await revokePortalSession("rt-to-revoke");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://support.test/auth/portal-revoke",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refresh_token: "rt-to-revoke" }),
      }),
    );
  });

  it("does not throw on failure (best-effort)", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, status: 500 });

    const { revokePortalSession } = await import("@/lib/oauth");
    // Should not throw
    await expect(revokePortalSession("rt")).resolves.toBeUndefined();
  });
});

// ---------- parseJwtClaims ----------
describe("parseJwtClaims", () => {
  function makeJwt(payload: Record<string, unknown>): string {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.fakesig`;
  }

  it("extracts display_name and other claims from JWT payload", async () => {
    const { parseJwtClaims } = await import("@/lib/oauth");
    const jwt = makeJwt({
      sub: "zoho-123",
      display_name: "Alice Smith",
      email: "alice@example.com",
      roles: ["support_staff"],
      exp: Math.floor(Date.now() / 1000) + 1800,
    });
    const claims = parseJwtClaims(jwt);
    expect(claims.display_name).toBe("Alice Smith");
    expect(claims.email).toBe("alice@example.com");
    expect(claims.exp).toBeGreaterThan(0);
  });

  it("returns null for malformed JWT", async () => {
    const { parseJwtClaims } = await import("@/lib/oauth");
    expect(parseJwtClaims("not-a-jwt")).toBeNull();
    expect(parseJwtClaims("")).toBeNull();
  });

  it("handles base64url padding correctly", async () => {
    const { parseJwtClaims } = await import("@/lib/oauth");
    // Create a JWT with base64url (no padding)
    const payload = { sub: "test", display_name: "Tëst Üser", exp: 9999999999 };
    const b64url = btoa(JSON.stringify(payload))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const jwt = `eyJhbGciOiJIUzI1NiJ9.${b64url}.sig`;
    const claims = parseJwtClaims(jwt);
    expect(claims?.display_name).toBe("Tëst Üser");
  });
});

// ---------- Cookie helper constants ----------
describe("cookie config", () => {
  it("exports correct cookie names and max ages", async () => {
    const {
      ACCESS_TOKEN_COOKIE,
      REFRESH_TOKEN_COOKIE,
      ACCESS_TOKEN_MAX_AGE,
      REFRESH_TOKEN_MAX_AGE,
    } = await import("@/lib/oauth");
    expect(ACCESS_TOKEN_COOKIE).toBe("cc_access_token");
    expect(REFRESH_TOKEN_COOKIE).toBe("cc_refresh_token");
    expect(ACCESS_TOKEN_MAX_AGE).toBe(30 * 60); // 30 min
    expect(REFRESH_TOKEN_MAX_AGE).toBe(12 * 60 * 60); // 12 hr
  });
});
