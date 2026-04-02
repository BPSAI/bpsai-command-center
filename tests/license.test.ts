import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Helper: build a fake JWT with given claims
function fakeJwt(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify(claims));
  return `${header}.${payload}.fake-sig`;
}

// ---------------------------------------------------------------------------
// hasLicenseInJwt
// ---------------------------------------------------------------------------
describe("hasLicenseInJwt", () => {
  it("returns true when JWT contains license_id claim", async () => {
    const { hasLicenseInJwt } = await import("@/lib/license");
    const token = fakeJwt({
      sub: "user1",
      display_name: "Alice",
      email: "alice@test.com",
      license_id: "LIC-123",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(hasLicenseInJwt(token)).toBe(true);
  });

  it("returns false when JWT has no license_id claim", async () => {
    const { hasLicenseInJwt } = await import("@/lib/license");
    const token = fakeJwt({
      sub: "user1",
      display_name: "Alice",
      email: "alice@test.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(hasLicenseInJwt(token)).toBe(false);
  });

  it("returns false when license_id is empty string", async () => {
    const { hasLicenseInJwt } = await import("@/lib/license");
    const token = fakeJwt({
      sub: "user1",
      license_id: "",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    expect(hasLicenseInJwt(token)).toBe(false);
  });

  it("returns false for invalid token", async () => {
    const { hasLicenseInJwt } = await import("@/lib/license");
    expect(hasLicenseInJwt("not-a-jwt")).toBe(false);
  });

  it("returns false for null/empty token", async () => {
    const { hasLicenseInJwt } = await import("@/lib/license");
    expect(hasLicenseInJwt("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getLicenseStatusFromCookie (client-side helper)
// ---------------------------------------------------------------------------
describe("getLicenseStatusFromCookie", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when cc_has_license cookie is '1'", async () => {
    vi.stubGlobal("document", { cookie: "operator=Alice; cc_has_license=1" });
    const { getLicenseStatusFromCookie } = await import("@/lib/license");
    expect(getLicenseStatusFromCookie()).toBe(true);
  });

  it("returns false when cc_has_license cookie is absent", async () => {
    vi.stubGlobal("document", { cookie: "operator=Alice" });
    const { getLicenseStatusFromCookie } = await import("@/lib/license");
    expect(getLicenseStatusFromCookie()).toBe(false);
  });

  it("returns false when cc_has_license cookie is '0'", async () => {
    vi.stubGlobal("document", { cookie: "cc_has_license=0" });
    const { getLicenseStatusFromCookie } = await import("@/lib/license");
    expect(getLicenseStatusFromCookie()).toBe(false);
  });

  it("returns false when document is undefined (SSR)", async () => {
    // document is not defined in SSR context
    const origDoc = globalThis.document;
    // @ts-expect-error intentional for SSR simulation
    delete globalThis.document;
    vi.resetModules();
    const { getLicenseStatusFromCookie } = await import("@/lib/license");
    expect(getLicenseStatusFromCookie()).toBe(false);
    globalThis.document = origDoc;
  });
});

// ---------------------------------------------------------------------------
// linkLicense (server-side — calls bpsai-support)
// ---------------------------------------------------------------------------
describe("linkLicense", () => {
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

  it("posts license key to bpsai-support and returns success", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ linked: true, license_id: "LIC-123" }),
    });

    const { linkLicense } = await import("@/lib/license");
    const result = await linkLicense("portal-jwt", "PCKEY-abc");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://support.test/users/me/license",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer portal-jwt",
        },
        body: JSON.stringify({ license_key: "PCKEY-abc" }),
      },
    );
    expect(result).toEqual({ linked: true, license_id: "LIC-123" });
  });

  it("throws on invalid license key (400)", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Invalid license key" }),
    });

    const { linkLicense } = await import("@/lib/license");
    await expect(linkLicense("portal-jwt", "BAD-KEY")).rejects.toThrow(
      "Invalid license key",
    );
  });

  it("throws on already linked (409)", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "License already linked to another account" }),
    });

    const { linkLicense } = await import("@/lib/license");
    await expect(linkLicense("portal-jwt", "USED-KEY")).rejects.toThrow(
      "License already linked",
    );
  });

  it("throws generic error on unexpected status", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal error" }),
    });

    const { linkLicense } = await import("@/lib/license");
    await expect(linkLicense("portal-jwt", "KEY")).rejects.toThrow(
      "Internal error",
    );
  });
});
