import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("A2A_BASE_URL config", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("exports A2A_BASE_URL with default when env is unset", async () => {
    delete process.env.A2A_BASE_URL;
    const { A2A_BASE_URL } = await import("../src/lib/config");
    expect(A2A_BASE_URL).toBe("https://a2a.paircoder.ai");
  });

  it("exports A2A_BASE_URL from env when set", async () => {
    process.env.A2A_BASE_URL = "https://custom.example.com";
    const { A2A_BASE_URL } = await import("../src/lib/config");
    expect(A2A_BASE_URL).toBe("https://custom.example.com");
  });

  it("no longer exports PAIRCODER_API_URL or LICENSE_ID (removed in UA2.3)", async () => {
    const config = await import("../src/lib/config");
    expect(config).not.toHaveProperty("PAIRCODER_API_URL");
    expect(config).not.toHaveProperty("LICENSE_ID");
  });
});
