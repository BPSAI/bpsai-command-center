import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";

// Mock fetch globally
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("LicenseLinkModal", () => {
  it("renders when hasLicense is false", async () => {
    const { default: LicenseLinkModal } = await import(
      "@/app/components/LicenseLinkModal"
    );
    render(<LicenseLinkModal hasLicense={false} onLinked={vi.fn()} />);
    expect(screen.getByText(/link your paircoder license/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/license key/i)).toBeTruthy();
  });

  it("does not render when hasLicense is true", async () => {
    const { default: LicenseLinkModal } = await import(
      "@/app/components/LicenseLinkModal"
    );
    const { container } = render(
      <LicenseLinkModal hasLicense={true} onLinked={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("submits license key and calls onLinked on success", async () => {
    // Mock successful link
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ linked: true }),
    });
    // Mock successful session refresh
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ refreshed: true }),
    });

    const onLinked = vi.fn();
    const { default: LicenseLinkModal } = await import(
      "@/app/components/LicenseLinkModal"
    );
    render(<LicenseLinkModal hasLicense={false} onLinked={onLinked} />);

    const input = screen.getByPlaceholderText(/license key/i);
    fireEvent.change(input, { target: { value: "PCKEY-abc-123" } });

    const submitBtn = screen.getByRole("button", { name: /link/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onLinked).toHaveBeenCalled();
    });

    // Verify POST to /api/license/link
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/license/link");
    expect(fetchSpy.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ license_key: "PCKEY-abc-123" }),
      }),
    );
    // Verify session refresh
    expect(fetchSpy.mock.calls[1][0]).toBe("/api/auth/refresh-session");
  });

  it("shows error message on link failure", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid license key" }),
    });

    const { default: LicenseLinkModal } = await import(
      "@/app/components/LicenseLinkModal"
    );
    render(<LicenseLinkModal hasLicense={false} onLinked={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/license key/i), {
      target: { value: "BAD-KEY" },
    });
    fireEvent.click(screen.getByRole("button", { name: /link/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid license key/i)).toBeTruthy();
    });
  });

  it("allows dismissing the modal via skip button", async () => {
    const { default: LicenseLinkModal } = await import(
      "@/app/components/LicenseLinkModal"
    );
    render(<LicenseLinkModal hasLicense={false} onLinked={vi.fn()} />);

    expect(screen.getByText(/link your paircoder license/i)).toBeTruthy();

    const skipBtn = screen.getByRole("button", { name: /skip/i });
    fireEvent.click(skipBtn);

    // Modal should be hidden after skip
    await waitFor(() => {
      expect(screen.queryByText(/link your paircoder license/i)).toBeNull();
    });
  });

  it("disables submit button when input is empty", async () => {
    const { default: LicenseLinkModal } = await import(
      "@/app/components/LicenseLinkModal"
    );
    render(<LicenseLinkModal hasLicense={false} onLinked={vi.fn()} />);

    const submitBtn = screen.getByRole("button", { name: /link/i });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows loading state during submission", async () => {
    // Never-resolving fetch to keep loading state
    fetchSpy.mockReturnValueOnce(new Promise(() => {}));

    const { default: LicenseLinkModal } = await import(
      "@/app/components/LicenseLinkModal"
    );
    render(<LicenseLinkModal hasLicense={false} onLinked={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/license key/i), {
      target: { value: "PCKEY-test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /link/i }));

    await waitFor(() => {
      expect(screen.getByText(/linking/i)).toBeTruthy();
    });
  });
});
