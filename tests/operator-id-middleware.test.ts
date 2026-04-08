import { describe, it, expect, vi, beforeEach } from "vitest";

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

const BASE_CLAIMS = {
  sub: "zoho-456",
  display_name: "Bob Jones",
  email: "bob@test.com",
  roles: ["admin"],
};

describe("JWT operator claim parsing", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("parseJwtClaims extracts operator claim when present", async () => {
    const { parseJwtClaims } = await import("@/lib/oauth");
    const token = makeJwt({ ...BASE_CLAIMS, operator: "bob-deadbeef" });
    const claims = parseJwtClaims(token);
    expect(claims).not.toBeNull();
    expect(claims!.operator).toBe("bob-deadbeef");
  });

  it("parseJwtClaims returns undefined operator when claim is absent", async () => {
    const { parseJwtClaims } = await import("@/lib/oauth");
    const token = makeJwt(BASE_CLAIMS);
    const claims = parseJwtClaims(token);
    expect(claims).not.toBeNull();
    expect(claims!.operator).toBeUndefined();
  });

  it("evaluateAuth includes operatorId from JWT operator claim", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const token = makeJwt({ ...BASE_CLAIMS, operator: "bob-deadbeef" }, 600);
    const result = evaluateAuth({
      pathname: "/",
      accessToken: token,
      refreshToken: "rt",
    });
    expect(result.action).toBe("allow");
    if (result.action === "allow") {
      expect(result.operatorId).toBe("bob-deadbeef");
    }
  });

  it("evaluateAuth returns empty operatorId when claim is absent", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const token = makeJwt(BASE_CLAIMS, 600);
    const result = evaluateAuth({
      pathname: "/",
      accessToken: token,
      refreshToken: "rt",
    });
    expect(result.action).toBe("allow");
    if (result.action === "allow") {
      expect(result.operatorId).toBe("");
    }
  });

  it("evaluateAuth includes operatorId in refresh action", async () => {
    const { evaluateAuth } = await import("@/lib/auth-middleware");
    const token = makeJwt({ ...BASE_CLAIMS, operator: "bob-deadbeef" }, 120);
    const result = evaluateAuth({
      pathname: "/",
      accessToken: token,
      refreshToken: "rt",
    });
    expect(result.action).toBe("refresh");
    if (result.action === "refresh") {
      expect(result.operatorId).toBe("bob-deadbeef");
    }
  });
});
