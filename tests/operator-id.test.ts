import { describe, it, expect, beforeEach } from "vitest";
import { getOperatorIdFromCookie } from "../src/lib/use-operator";

beforeEach(() => {
  Object.defineProperty(document, "cookie", { value: "", writable: true });
});

describe("getOperatorIdFromCookie", () => {
  it("returns operator ID from cc_operator_id cookie", () => {
    document.cookie = "cc_operator_id=john-a1b2c3d4";
    expect(getOperatorIdFromCookie()).toBe("john-a1b2c3d4");
  });

  it("returns empty string when no cc_operator_id cookie", () => {
    document.cookie = "operator=alice; cc_has_license=1";
    expect(getOperatorIdFromCookie()).toBe("");
  });

  it("handles multiple cookies", () => {
    document.cookie = "operator=alice; cc_operator_id=alice-deadbeef; cc_has_license=1";
    expect(getOperatorIdFromCookie()).toBe("alice-deadbeef");
  });

  it("decodes URI-encoded values", () => {
    document.cookie = "cc_operator_id=user%2Dtest%2D1234";
    expect(getOperatorIdFromCookie()).toBe("user-test-1234");
  });
});
