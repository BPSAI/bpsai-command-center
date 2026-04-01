import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We'll dynamically import the module after setting env vars
const ORIGINAL_ENV = process.env;

describe("a2a-auth", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  describe("getA2AAuthHeaders", () => {
    it("returns only x-operator header when LICENSE_ID is not set", async () => {
      delete process.env.LICENSE_ID;
      const { getA2AAuthHeaders } = await import("../src/lib/a2a-auth");

      const headers = await getA2AAuthHeaders("op1");

      expect(headers).toEqual({ "x-operator": "op1" });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("fetches a JWT and returns Authorization header when LICENSE_ID is set", async () => {
      process.env.LICENSE_ID = "license-uuid-123";
      process.env.PAIRCODER_API_URL = "https://api.test.com";

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "jwt-token-abc",
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          tier: "pro",
          operator: "op1",
        }),
      });

      const { getA2AAuthHeaders } = await import("../src/lib/a2a-auth");
      const headers = await getA2AAuthHeaders("op1");

      expect(headers).toEqual({
        "x-operator": "op1",
        Authorization: "Bearer jwt-token-abc",
      });
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.test.com/api/v1/auth/operator-token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            license_id: "license-uuid-123",
            operator: "op1",
          }),
        },
      );
    });

    it("caches token and reuses on second call", async () => {
      process.env.LICENSE_ID = "license-uuid-123";
      process.env.PAIRCODER_API_URL = "https://api.test.com";

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "jwt-cached",
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          tier: "pro",
          operator: "op1",
        }),
      });

      const { getA2AAuthHeaders } = await import("../src/lib/a2a-auth");

      await getA2AAuthHeaders("op1");
      const headers = await getA2AAuthHeaders("op1");

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(headers).toEqual({
        "x-operator": "op1",
        Authorization: "Bearer jwt-cached",
      });
    });

    it("refetches token when cached token is expired", async () => {
      process.env.LICENSE_ID = "license-uuid-123";
      process.env.PAIRCODER_API_URL = "https://api.test.com";

      // First call: token that's already expired
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "jwt-old",
          expires_at: new Date(Date.now() - 1000).toISOString(),
          tier: "pro",
          operator: "op1",
        }),
      });

      // Second call: fresh token
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "jwt-new",
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          tier: "pro",
          operator: "op1",
        }),
      });

      const { getA2AAuthHeaders } = await import("../src/lib/a2a-auth");

      await getA2AAuthHeaders("op1");
      const headers = await getA2AAuthHeaders("op1");

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(headers).toEqual({
        "x-operator": "op1",
        Authorization: "Bearer jwt-new",
      });
    });

    it("falls back to x-operator only when token fetch fails", async () => {
      process.env.LICENSE_ID = "license-uuid-123";
      process.env.PAIRCODER_API_URL = "https://api.test.com";

      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { getA2AAuthHeaders } = await import("../src/lib/a2a-auth");
      const headers = await getA2AAuthHeaders("op1");

      expect(headers).toEqual({ "x-operator": "op1" });
    });

    it("falls back to x-operator only when fetch throws", async () => {
      process.env.LICENSE_ID = "license-uuid-123";
      process.env.PAIRCODER_API_URL = "https://api.test.com";

      fetchSpy.mockRejectedValueOnce(new Error("Network error"));

      const { getA2AAuthHeaders } = await import("../src/lib/a2a-auth");
      const headers = await getA2AAuthHeaders("op1");

      expect(headers).toEqual({ "x-operator": "op1" });
    });

    it("uses default PAIRCODER_API_URL when env var is not set", async () => {
      process.env.LICENSE_ID = "license-uuid-123";
      delete process.env.PAIRCODER_API_URL;

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: "jwt-default",
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          tier: "pro",
          operator: "op1",
        }),
      });

      const { getA2AAuthHeaders } = await import("../src/lib/a2a-auth");
      await getA2AAuthHeaders("op1");

      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.paircoder.ai/api/v1/auth/operator-token",
        expect.any(Object),
      );
    });
  });
});
