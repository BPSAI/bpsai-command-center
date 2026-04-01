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

  it("exports PAIRCODER_API_URL with default when env is unset", async () => {
    delete process.env.PAIRCODER_API_URL;
    const { PAIRCODER_API_URL } = await import("../src/lib/config");
    expect(PAIRCODER_API_URL).toBe("https://api.paircoder.ai");
  });

  it("exports PAIRCODER_API_URL from env when set", async () => {
    process.env.PAIRCODER_API_URL = "https://custom-api.example.com";
    const { PAIRCODER_API_URL } = await import("../src/lib/config");
    expect(PAIRCODER_API_URL).toBe("https://custom-api.example.com");
  });

  it("exports LICENSE_ID as empty string when env is unset", async () => {
    delete process.env.LICENSE_ID;
    const { LICENSE_ID } = await import("../src/lib/config");
    expect(LICENSE_ID).toBe("");
  });

  it("exports LICENSE_ID from env when set", async () => {
    process.env.LICENSE_ID = "my-license-uuid";
    const { LICENSE_ID } = await import("../src/lib/config");
    expect(LICENSE_ID).toBe("my-license-uuid");
  });
});
