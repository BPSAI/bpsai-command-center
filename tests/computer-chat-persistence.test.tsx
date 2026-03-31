import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  type ChatMessage,
} from "../src/lib/chat-storage";
import { getOperatorFromCookie } from "../src/lib/use-operator";

// These tests verify the persistence integration logic without rendering React.
// They test the contract that ComputerChat will use.

beforeEach(() => {
  localStorage.clear();
});

describe("ComputerChat persistence contract", () => {
  const operator = "alice";

  it("saves messages on each update and restores after refresh", () => {
    const sessionId = "test-session-1";
    const messages: ChatMessage[] = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi there" },
    ];

    // Simulate: component saves on each message
    saveSession(operator, sessionId, messages.slice(0, 1));
    saveSession(operator, sessionId, messages);

    // Simulate: page refresh — load from storage
    const restored = loadSession(operator, sessionId);
    expect(restored).toEqual(messages);
  });

  it("new chat creates a fresh session while preserving old ones", () => {
    saveSession(operator, "old-session", [
      { role: "user", content: "old conversation" },
    ]);

    // "New Chat" = generate new session ID, start with empty messages
    const newSessionId = "new-session";
    // Don't save until first message
    const sessions = listSessions(operator);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe("old-session");

    // First message in new session triggers save
    saveSession(newSessionId, newSessionId, []);
    // Old session still intact
    expect(loadSession(operator, "old-session")).toHaveLength(1);
  });

  it("clear deletes current session from storage", () => {
    saveSession(operator, "sess-to-clear", [
      { role: "user", content: "will be cleared" },
    ]);
    saveSession(operator, "sess-to-keep", [
      { role: "user", content: "keep this" },
    ]);

    deleteSession(operator, "sess-to-clear");

    expect(loadSession(operator, "sess-to-clear")).toEqual([]);
    expect(loadSession(operator, "sess-to-keep")).toHaveLength(1);
    expect(listSessions(operator)).toHaveLength(1);
  });

  it("operator isolation — bob cannot see alice's sessions", () => {
    saveSession("alice", "alice-s1", [{ role: "user", content: "alice msg" }]);
    saveSession("bob", "bob-s1", [{ role: "user", content: "bob msg" }]);

    expect(listSessions("alice")).toHaveLength(1);
    expect(listSessions("bob")).toHaveLength(1);
    expect(listSessions("alice")[0].id).toBe("alice-s1");
    expect(listSessions("bob")[0].id).toBe("bob-s1");

    // Cross-access returns nothing
    expect(loadSession("alice", "bob-s1")).toEqual([]);
    expect(loadSession("bob", "alice-s1")).toEqual([]);
  });

  it("session list shows all conversations for current operator", () => {
    saveSession(operator, "s1", [{ role: "user", content: "first" }]);
    saveSession(operator, "s2", [{ role: "user", content: "second" }]);
    saveSession(operator, "s3", [{ role: "user", content: "third" }]);

    const sessions = listSessions(operator);
    expect(sessions).toHaveLength(3);
    expect(sessions.map((s) => s.id).sort()).toEqual(["s1", "s2", "s3"]);
  });

  it("click to restore loads the selected session's messages", () => {
    const s1Messages: ChatMessage[] = [
      { role: "user", content: "session 1 msg" },
      { role: "assistant", content: "reply 1" },
    ];
    const s2Messages: ChatMessage[] = [
      { role: "user", content: "session 2 msg" },
    ];

    saveSession(operator, "s1", s1Messages);
    saveSession(operator, "s2", s2Messages);

    // Simulate clicking session s1
    const restored = loadSession(operator, "s1");
    expect(restored).toEqual(s1Messages);

    // Simulate clicking session s2
    const restored2 = loadSession(operator, "s2");
    expect(restored2).toEqual(s2Messages);
  });
});
