import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------- /auth/callback route handler ----------
describe("auth callback handler", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
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

  it("exchanges code for tokens and sets httpOnly cookies", async () => {
    // Mock: exchangeCodeForTokens
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
    // Mock: exchangeForPortalSession
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "portal-at",
        refresh_token: "portal-rt",
        expires_in: 1800,
        token_type: "Bearer",
      }),
    });

    const { handleCallback } = await import("@/lib/auth-handlers");
    const result = await handleCallback({
      code: "auth-code-123",
      codeVerifier: "verifier-abc",
      redirectUri: "http://localhost:3000/auth/callback",
    });

    expect(result.portalAccessToken).toBe("portal-at");
    expect(result.portalRefreshToken).toBe("portal-rt");
    // Verify both API calls were made
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    // First call: token exchange
    expect(fetchSpy.mock.calls[0][0]).toBe("https://support.test/auth/token");
    // Second call: portal session
    expect(fetchSpy.mock.calls[1][0]).toBe(
      "https://support.test/auth/portal-session",
    );
  });

  it("throws when token exchange fails", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Bad Request",
    });

    const { handleCallback } = await import("@/lib/auth-handlers");
    await expect(
      handleCallback({
        code: "bad-code",
        codeVerifier: "v",
        redirectUri: "http://localhost:3000/auth/callback",
      }),
    ).rejects.toThrow("Token exchange failed");
  });

  it("throws when portal session fails", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "zoho-at",
        expires_in: 3600,
        token_type: "Bearer",
      }),
    });
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "User not registered",
    });

    const { handleCallback } = await import("@/lib/auth-handlers");
    await expect(
      handleCallback({
        code: "code",
        codeVerifier: "v",
        redirectUri: "http://localhost:3000/auth/callback",
      }),
    ).rejects.toThrow("Portal session failed");
  });
});

// ---------- /api/logout handler ----------
describe("logout handler", () => {
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

  it("revokes refresh token and returns cookie clear instructions", async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, status: 204 });

    const { handleLogout } = await import("@/lib/auth-handlers");
    const result = await handleLogout("rt-to-revoke");

    expect(result.clearCookies).toBe(true);
    expect(result.redirectTo).toBe("/login");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://support.test/auth/portal-revoke",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refresh_token: "rt-to-revoke" }),
      }),
    );
  });

  it("still clears cookies even if revoke fails (best-effort)", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network error"));

    const { handleLogout } = await import("@/lib/auth-handlers");
    const result = await handleLogout("rt");

    expect(result.clearCookies).toBe(true);
    expect(result.redirectTo).toBe("/login");
  });

  it("handles missing refresh token gracefully", async () => {
    const { handleLogout } = await import("@/lib/auth-handlers");
    const result = await handleLogout(null);

    expect(result.clearCookies).toBe(true);
    expect(result.redirectTo).toBe("/login");
    // Should not call revoke if no token
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ---------- login redirect builder ----------
describe("buildLoginRedirect", () => {
  beforeEach(() => {
    vi.stubEnv("ZOHO_CLIENT_ID", "test-client-id");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns Zoho auth URL with PKCE params and state", async () => {
    const { buildLoginRedirect } = await import("@/lib/auth-handlers");
    const result = await buildLoginRedirect(
      "http://localhost:3000/auth/callback",
    );

    expect(result.authUrl).toContain("accounts.zoho.com/oauth/v2/auth");
    expect(result.authUrl).toContain("code_challenge=");
    expect(result.authUrl).toContain("state=");
    expect(result.codeVerifier).toBeTruthy();
    expect(result.state).toBeTruthy();
  });

  it("generates unique state per call", async () => {
    const { buildLoginRedirect } = await import("@/lib/auth-handlers");
    const r1 = await buildLoginRedirect("http://localhost:3000/auth/callback");
    const r2 = await buildLoginRedirect("http://localhost:3000/auth/callback");
    expect(r1.state).not.toBe(r2.state);
  });
});
