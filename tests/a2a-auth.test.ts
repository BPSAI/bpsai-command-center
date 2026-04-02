import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("a2a-auth", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe("getA2AAuthHeaders", () => {
    it("returns Authorization Bearer + x-operator when portal JWT is provided", async () => {
      const { getA2AAuthHeaders } = await import("../src/lib/a2a-auth");

      const headers = getA2AAuthHeaders("alice", "portal-jwt-token-123");

      expect(headers).toEqual({
        "x-operator": "alice",
        Authorization: "Bearer portal-jwt-token-123",
      });
    });

    it("returns only x-operator and logs warning when no portal JWT", async () => {
      const { getA2AAuthHeaders } = await import("../src/lib/a2a-auth");

      const headers = getA2AAuthHeaders("bob", undefined);

      expect(headers).toEqual({ "x-operator": "bob" });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("No portal JWT"),
      );
    });

    it("returns only x-operator and logs warning when portal JWT is empty string", async () => {
      const { getA2AAuthHeaders } = await import("../src/lib/a2a-auth");

      const headers = getA2AAuthHeaders("carol", "");

      expect(headers).toEqual({ "x-operator": "carol" });
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it("does not call fetch (no operator-token minting)", async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const { getA2AAuthHeaders } = await import("../src/lib/a2a-auth");
      getA2AAuthHeaders("dave", "some-jwt");

      expect(fetchSpy).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });
  });
});
