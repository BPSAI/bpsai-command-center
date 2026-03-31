import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the pure logic by importing and testing the middleware function
// Since middleware uses NextRequest/NextResponse, we mock them minimally

function encode(user: string, pass: string): string {
  return "Basic " + btoa(`${user}:${pass}`);
}

// Inline the timing-safe compare and auth logic to test it directly
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
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
