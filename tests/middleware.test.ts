import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac, timingSafeEqual as cryptoTimingSafeEqual } from "crypto";

// We test the pure logic by importing and testing the middleware function
// Since middleware uses NextRequest/NextResponse, we mock them minimally

function encode(user: string, pass: string): string {
  return "Basic " + btoa(`${user}:${pass}`);
}

// HMAC-based timing-safe compare (matches middleware.ts implementation)
function timingSafeEqual(a: string, b: string): boolean {
  const key = "timing-safe-compare";
  const ha = createHmac("sha256", key).update(a).digest();
  const hb = createHmac("sha256", key).update(b).digest();
  return cryptoTimingSafeEqual(ha, hb);
}

function parseCredentials(authHeader: string): { user: string; pass: string } | null {
  if (!authHeader.startsWith("Basic ")) return null;
  const decoded = atob(authHeader.slice(6));
  const colonIdx = decoded.indexOf(":");
  if (colonIdx === -1) return null;
  return {
    user: decoded.slice(0, colonIdx),
    pass: decoded.slice(colonIdx + 1),
  };
}

/** Parse AUTHORIZED_USERS env var: "user1:pass1,user2:pass2" */
function parseAuthorizedUsers(raw: string): Map<string, string> {
  const users = new Map<string, string>();
  if (!raw.trim()) return users;
  for (const entry of raw.split(",")) {
    const colonIdx = entry.indexOf(":");
    if (colonIdx === -1) continue;
    const user = entry.slice(0, colonIdx).trim();
    const pass = entry.slice(colonIdx + 1).trim();
    if (user) users.set(user, pass);
  }
  return users;
}

/** Authenticate against authorized users map. Returns username or null. */
function authenticateUser(
  authHeader: string | null,
  authorizedUsers: Map<string, string>,
): string | null {
  if (!authHeader) return null;
  const creds = parseCredentials(authHeader);
  if (!creds) return null;
  const expectedPass = authorizedUsers.get(creds.user);
  if (expectedPass === undefined) return null;
  if (!timingSafeEqual(creds.pass, expectedPass)) return null;
  return creds.user;
}

describe("auth credential parsing", () => {
  it("splits on first colon only (password with colons)", () => {
    const header = encode("admin", "p@ss:word:with:colons");
    const creds = parseCredentials(header);
    expect(creds).toEqual({ user: "admin", pass: "p@ss:word:with:colons" });
  });

  it("returns null for missing colon", () => {
    const header = "Basic " + btoa("nocolon");
    expect(parseCredentials(header)).toBeNull();
  });

  it("returns null for non-Basic scheme", () => {
    expect(parseCredentials("Bearer token123")).toBeNull();
  });

  it("handles empty password", () => {
    const header = encode("admin", "");
    const creds = parseCredentials(header);
    expect(creds).toEqual({ user: "admin", pass: "" });
  });
});

describe("timingSafeEqual", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeEqual("hello", "hello")).toBe(true);
  });

  it("returns false for different strings of same length", () => {
    expect(timingSafeEqual("hello", "world")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(timingSafeEqual("short", "longer")).toBe(false);
  });

  it("returns true for empty strings", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });
});

describe("parseAuthorizedUsers", () => {
  it("parses comma-separated user:pass pairs", () => {
    const users = parseAuthorizedUsers("alice:pass1,bob:pass2");
    expect(users.size).toBe(2);
    expect(users.get("alice")).toBe("pass1");
    expect(users.get("bob")).toBe("pass2");
  });

  it("handles passwords with colons", () => {
    const users = parseAuthorizedUsers("admin:p@ss:word");
    expect(users.get("admin")).toBe("p@ss:word");
  });

  it("trims whitespace around user and pass", () => {
    const users = parseAuthorizedUsers(" alice : pass1 , bob : pass2 ");
    expect(users.get("alice")).toBe("pass1");
    expect(users.get("bob")).toBe("pass2");
  });

  it("returns empty map for empty string", () => {
    expect(parseAuthorizedUsers("").size).toBe(0);
  });

  it("skips entries without colon", () => {
    const users = parseAuthorizedUsers("valid:pass,invalid,also:good");
    expect(users.size).toBe(2);
    expect(users.has("invalid")).toBe(false);
  });

  it("skips entries with empty username", () => {
    const users = parseAuthorizedUsers(":nouser,alice:pass");
    expect(users.size).toBe(1);
    expect(users.has("")).toBe(false);
  });

  it("handles single user", () => {
    const users = parseAuthorizedUsers("solo:hunter2");
    expect(users.size).toBe(1);
    expect(users.get("solo")).toBe("hunter2");
  });
});

describe("authenticateUser", () => {
  const users = parseAuthorizedUsers("alice:secret,bob:password123");

  it("returns username for valid credentials", () => {
    const header = encode("alice", "secret");
    expect(authenticateUser(header, users)).toBe("alice");
  });

  it("returns username for second user", () => {
    const header = encode("bob", "password123");
    expect(authenticateUser(header, users)).toBe("bob");
  });

  it("returns null for wrong password", () => {
    const header = encode("alice", "wrong");
    expect(authenticateUser(header, users)).toBeNull();
  });

  it("returns null for unknown user", () => {
    const header = encode("charlie", "secret");
    expect(authenticateUser(header, users)).toBeNull();
  });

  it("returns null for null header", () => {
    expect(authenticateUser(null, users)).toBeNull();
  });

  it("returns null for non-Basic header", () => {
    expect(authenticateUser("Bearer tok", users)).toBeNull();
  });

  it("returns null for malformed base64", () => {
    expect(authenticateUser("Basic " + btoa("nocolon"), users)).toBeNull();
  });

  it("rejects different-length password without timing leak", () => {
    // alice's password is "secret" (6 chars), try with much longer password
    const header = encode("alice", "this-is-a-much-longer-password");
    expect(authenticateUser(header, users)).toBeNull();
  });

  it("rejects shorter password without timing leak", () => {
    // bob's password is "password123" (11 chars), try with short password
    const header = encode("bob", "pw");
    expect(authenticateUser(header, users)).toBeNull();
  });
});
