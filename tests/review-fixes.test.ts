import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  display_name: "Alice Smith",
  email: "alice@test.com",
  roles: ["support_staff"],
};

// ---------------------------------------------------------------------------
// Fix 1: PUBLIC_PATHS includes /api/auth routes
// ---------------------------------------------------------------------------
describe("Fix 1: PUBLIC_PATHS includes /api/auth routes", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("includes /api/auth/login in PUBLIC_PATHS", async () => {
    const { PUBLIC_PATHS } = await import("@/lib/auth-middleware");
    expect(PUBLIC_PATHS).toContain("/api/auth/login");
  });

  it("includes /api/auth/callback in PUBLIC_PATHS", async () => {
    const { PUBLIC_PATHS } = await import("@/lib/auth-middleware");
    expect(PUBLIC_PATHS).toContain("/api/auth/callback");
  });

  it("includes /api/auth/logout in PUBLIC_PATHS", async () => {
    const { PUBLIC_PATHS } = await import("@/lib/auth-middleware");
    expect(PUBLIC_PATHS).toContain("/api/auth/logout");
  });

  it("evaluateAuth skips /api/auth/login without token", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/api/auth/login",
      accessToken: null,
      refreshToken: null,
    });
    expect(result.action).toBe("skip");
  });

  it("evaluateAuth skips /api/auth/callback without token", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const result = evaluateAuth({
      pathname: "/api/auth/callback",
      accessToken: null,
      refreshToken: null,
    });
    expect(result.action).toBe("skip");
  });
});

// ---------------------------------------------------------------------------
// Fix 2: Callback uses POST (not GET with query string)
// ---------------------------------------------------------------------------
describe("Fix 2: callback route is POST", () => {
  it("callback route.ts exports POST handler (not GET)", async () => {
    const routeModule = await import(
      "@/app/api/auth/callback/route"
    );
    expect(routeModule.POST).toBeDefined();
    expect(routeModule.GET).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Fix 3: parseJwtClaims has SECURITY comment
// ---------------------------------------------------------------------------
describe("Fix 3: parseJwtClaims SECURITY documentation", () => {
  it("oauth.ts source contains SECURITY comment above parseJwtClaims", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("src/lib/oauth.ts", "utf-8");
    // Check the SECURITY comment exists before parseJwtClaims
    const securityIdx = source.indexOf("SECURITY");
    const fnIdx = source.indexOf("export function parseJwtClaims");
    expect(securityIdx).toBeGreaterThan(-1);
    expect(fnIdx).toBeGreaterThan(-1);
    expect(securityIdx).toBeLessThan(fnIdx);
    // Check it mentions the trust boundary
    const commentBlock = source.substring(securityIdx, fnIdx);
    expect(commentBlock).toMatch(/trust/i);
    expect(commentBlock).toMatch(/bpsai-support/i);
  });
});

// ---------------------------------------------------------------------------
// Fix 4: maxAge on operator and cc_has_license cookies
// ---------------------------------------------------------------------------
describe("Fix 4: cookie maxAge alignment", () => {
  it("ACCESS_TOKEN_MAX_AGE is exported for cookie maxAge use", async () => {
    const { ACCESS_TOKEN_MAX_AGE } = await import("@/lib/oauth");
    expect(ACCESS_TOKEN_MAX_AGE).toBe(30 * 60);
  });
});

// ---------------------------------------------------------------------------
// Fix 5: config.ts uses server-only guard
// ---------------------------------------------------------------------------
describe("Fix 5: config.ts server-only guard", () => {
  it("config.ts source starts with server-only import", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("src/lib/config.ts", "utf-8");
    // Must be the first meaningful import
    const lines = source.split("\n").filter((l: string) => l.trim().length > 0);
    expect(lines[0]).toMatch(/import\s+["']server-only["']/);
  });
});

// ---------------------------------------------------------------------------
// Fix 6: Env var validation
// ---------------------------------------------------------------------------
describe("Fix 6: env var validation", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requireAuthEnv throws when SUPPORT_API_URL is empty", async () => {
    vi.stubEnv("SUPPORT_API_URL", "");
    vi.stubEnv("ZOHO_CLIENT_ID", "some-id");
    const { requireAuthEnv } = await import("@/lib/oauth");
    expect(() => requireAuthEnv()).toThrow("SUPPORT_API_URL");
  });

  it("requireAuthEnv throws when ZOHO_CLIENT_ID is empty", async () => {
    vi.stubEnv("SUPPORT_API_URL", "https://support.test");
    vi.stubEnv("ZOHO_CLIENT_ID", "");
    const { requireAuthEnv } = await import("@/lib/oauth");
    expect(() => requireAuthEnv()).toThrow("ZOHO_CLIENT_ID");
  });

  it("requireAuthEnv does not throw when both are set", async () => {
    vi.stubEnv("SUPPORT_API_URL", "https://support.test");
    vi.stubEnv("ZOHO_CLIENT_ID", "some-id");
    const { requireAuthEnv } = await import("@/lib/oauth");
    expect(() => requireAuthEnv()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Fix 7: linkLicense error path handles non-JSON response
// ---------------------------------------------------------------------------
describe("Fix 7: linkLicense error path handles non-JSON response", () => {
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

  it("throws a meaningful error when error response is not JSON", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });

    const { linkLicense } = await import("@/lib/license");
    await expect(linkLicense("token", "KEY")).rejects.toThrow(
      /License link failed: 502/,
    );
  });
});

// ---------------------------------------------------------------------------
// Fix 8: redirectUri uses NEXT_PUBLIC_APP_URL
// ---------------------------------------------------------------------------
describe("Fix 8: redirectUri uses NEXT_PUBLIC_APP_URL", () => {
  it("login route source uses NEXT_PUBLIC_APP_URL for redirectUri", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/auth/login/route.ts",
      "utf-8",
    );
    expect(source).toContain("NEXT_PUBLIC_APP_URL");
    // Should NOT use request.nextUrl.origin for redirect_uri
    expect(source).not.toMatch(/request\.nextUrl\.origin/);
  });

  it("callback route source uses NEXT_PUBLIC_APP_URL for redirectUri", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "src/app/api/auth/callback/route.ts",
      "utf-8",
    );
    expect(source).toContain("NEXT_PUBLIC_APP_URL");
    expect(source).not.toMatch(/request\.nextUrl\.origin/);
  });
});
