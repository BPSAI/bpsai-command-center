import { describe, it, expect, beforeEach } from "vitest";
import { getOperatorFromCookie } from "../src/lib/use-operator";

beforeEach(() => {
  Object.defineProperty(document, "cookie", { value: "", writable: true });
});

describe("getOperatorFromCookie", () => {
  it("returns operator value from cookie", () => {
    document.cookie = "operator=alice";
    expect(getOperatorFromCookie()).toBe("alice");
  });

  it("returns empty string when no operator cookie", () => {
    document.cookie = "other=value";
    expect(getOperatorFromCookie()).toBe("");
  });

  it("handles multiple cookies", () => {
    document.cookie = "theme=dark; operator=bob; lang=en";
    expect(getOperatorFromCookie()).toBe("bob");
  });

  it("decodes URI-encoded values", () => {
    document.cookie = "operator=user%40example";
    expect(getOperatorFromCookie()).toBe("user@example");
  });
});
