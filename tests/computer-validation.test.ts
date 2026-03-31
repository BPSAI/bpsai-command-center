import { describe, it, expect } from "vitest";

// Test the validation logic used in /api/computer
const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 32 * 1024;
const VALID_ROLES = new Set(["user", "assistant"]);

interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateMessages(messages: unknown[]): ValidationResult {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { valid: false, error: "No messages provided" };
  }
  if (messages.length > MAX_MESSAGES) {
    return { valid: false, error: `Too many messages (max ${MAX_MESSAGES})` };
  }
  for (const msg of messages) {
    if (typeof msg !== "object" || msg === null) {
      return { valid: false, error: "Invalid message format" };
    }
    const m = msg as Record<string, unknown>;
    if (!VALID_ROLES.has(m.role as string)) {
      return { valid: false, error: `Invalid role: ${String(m.role)}` };
    }
    if (typeof m.content !== "string") {
      return { valid: false, error: "Message content must be a string" };
    }
    if (m.content.length > MAX_CONTENT_LENGTH) {
      return { valid: false, error: "Message content too large" };
    }
  }
  return { valid: true };
}

describe("/api/computer input validation", () => {
  it("accepts valid messages", () => {
    const result = validateMessages([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there" },
    ]);
    expect(result.valid).toBe(true);
  });

  it("rejects empty messages array", () => {
    expect(validateMessages([]).valid).toBe(false);
  });

  it("rejects non-array", () => {
    expect(validateMessages("not-array" as unknown as unknown[]).valid).toBe(false);
  });

  it("rejects too many messages", () => {
    const msgs = Array.from({ length: 51 }, (_, i) => ({
      role: "user",
      content: `msg ${i}`,
    }));
    const result = validateMessages(msgs);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Too many");
  });

  it("rejects invalid role", () => {
    const result = validateMessages([{ role: "system", content: "test" }]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid role");
  });

  it("rejects non-string content", () => {
    const result = validateMessages([{ role: "user", content: 123 }]);
    expect(result.valid).toBe(false);
  });

  it("rejects oversized content", () => {
    const result = validateMessages([
      { role: "user", content: "x".repeat(MAX_CONTENT_LENGTH + 1) },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too large");
  });

  it("accepts exactly 50 messages", () => {
    const msgs = Array.from({ length: 50 }, () => ({
      role: "user",
      content: "ok",
    }));
    expect(validateMessages(msgs).valid).toBe(true);
  });
});
