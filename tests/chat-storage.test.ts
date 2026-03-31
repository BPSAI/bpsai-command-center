import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveSession,
  loadSession,
  deleteSession,
  listSessions,
  generateSessionId,
  type ChatMessage,
  type SessionMeta,
} from "../src/lib/chat-storage";

beforeEach(() => {
  localStorage.clear();
});

describe("generateSessionId", () => {
  it("returns a non-empty string", () => {
    const id = generateSessionId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("returns unique IDs", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateSessionId()));
    expect(ids.size).toBe(20);
  });
});

describe("saveSession / loadSession round-trip", () => {
  it("saves and restores messages", () => {
    const msgs: ChatMessage[] = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ];
    saveSession("alice", "s1", msgs);
    expect(loadSession("alice", "s1")).toEqual(msgs);
  });

  it("returns empty array for missing session", () => {
    expect(loadSession("alice", "nonexistent")).toEqual([]);
  });

  it("overwrites previous save", () => {
    saveSession("alice", "s1", [{ role: "user", content: "v1" }]);
    saveSession("alice", "s1", [{ role: "user", content: "v2" }]);
    const loaded = loadSession("alice", "s1");
    expect(loaded).toHaveLength(1);
    expect(loaded[0].content).toBe("v2");
  });
});

describe("operator isolation", () => {
  it("different operators cannot see each other's sessions", () => {
    saveSession("alice", "s1", [{ role: "user", content: "alice msg" }]);
    saveSession("bob", "s2", [{ role: "user", content: "bob msg" }]);

    expect(loadSession("alice", "s1")).toHaveLength(1);
    expect(loadSession("bob", "s1")).toEqual([]);
    expect(loadSession("alice", "s2")).toEqual([]);
    expect(loadSession("bob", "s2")).toHaveLength(1);
  });

  it("listSessions returns only sessions for the given operator", () => {
    saveSession("alice", "s1", [{ role: "user", content: "a" }]);
    saveSession("alice", "s2", [{ role: "user", content: "b" }]);
    saveSession("bob", "s3", [{ role: "user", content: "c" }]);

    const aliceSessions = listSessions("alice");
    const bobSessions = listSessions("bob");

    expect(aliceSessions).toHaveLength(2);
    expect(bobSessions).toHaveLength(1);
    expect(aliceSessions.map((s: SessionMeta) => s.id).sort()).toEqual(["s1", "s2"]);
    expect(bobSessions[0].id).toBe("s3");
  });
});

describe("listSessions", () => {
  it("returns sessions sorted by updatedAt descending (newest first)", () => {
    const now = vi.spyOn(Date, "now");
    now.mockReturnValue(1000);
    saveSession("alice", "s1", [{ role: "user", content: "first" }]);
    now.mockReturnValue(2000);
    saveSession("alice", "s2", [{ role: "user", content: "second" }]);
    now.mockRestore();

    const sessions = listSessions("alice");
    expect(sessions[0].id).toBe("s2");
    expect(sessions[1].id).toBe("s1");
  });

  it("includes preview from last user message", () => {
    saveSession("alice", "s1", [
      { role: "user", content: "How do I deploy?" },
      { role: "assistant", content: "Use the deploy command" },
    ]);

    const sessions = listSessions("alice");
    expect(sessions[0].preview).toContain("How do I deploy?");
  });

  it("returns empty array when no sessions exist", () => {
    expect(listSessions("nobody")).toEqual([]);
  });
});

describe("QuotaExceededError handling", () => {
  it("saveSession does not throw on QuotaExceededError", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    expect(() =>
      saveSession("alice", "s1", [{ role: "user", content: "hello" }]),
    ).not.toThrow();

    spy.mockRestore();
  });

  it("saveSession returns false on QuotaExceededError", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    const result = saveSession("alice", "s1", [{ role: "user", content: "hello" }]);
    expect(result).toBe(false);

    spy.mockRestore();
  });

  it("saveSession returns true on success", () => {
    const result = saveSession("alice", "s1", [{ role: "user", content: "hello" }]);
    expect(result).toBe(true);
  });
});

describe("deleteSession", () => {
  it("removes a session from storage", () => {
    saveSession("alice", "s1", [{ role: "user", content: "test" }]);
    deleteSession("alice", "s1");
    expect(loadSession("alice", "s1")).toEqual([]);
    expect(listSessions("alice")).toEqual([]);
  });

  it("does not throw for nonexistent session", () => {
    expect(() => deleteSession("alice", "nope")).not.toThrow();
  });

  it("does not affect other sessions", () => {
    saveSession("alice", "s1", [{ role: "user", content: "keep" }]);
    saveSession("alice", "s2", [{ role: "user", content: "delete" }]);
    deleteSession("alice", "s2");
    expect(listSessions("alice")).toHaveLength(1);
    expect(loadSession("alice", "s1")).toHaveLength(1);
  });
});
