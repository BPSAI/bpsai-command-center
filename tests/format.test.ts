import { describe, it, expect } from "vitest";
import { formatTime, formatDate } from "@/app/lib/format";

describe("formatTime", () => {
  it("returns HH:MM by default", () => {
    const result = formatTime("2026-03-31T14:30:00Z");
    // The exact output depends on locale, but should contain digits and colons
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it("includes seconds when requested", () => {
    const result = formatTime("2026-03-31T14:30:45Z", true);
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it("returns raw string for invalid date", () => {
    expect(formatTime("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDate", () => {
  it("returns short month and day", () => {
    const result = formatDate("2026-03-31T14:30:00Z");
    expect(result).toMatch(/\d{1,2}/); // should contain a day number
  });

  it("returns raw string for invalid date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});
