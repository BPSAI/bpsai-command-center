import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  cleanup();
  vi.resetModules();
});

describe("OperatorIdDisplay", () => {
  it("renders operator ID when provided", async () => {
    const { default: OperatorIdDisplay } = await import(
      "@/app/components/OperatorIdDisplay"
    );
    render(<OperatorIdDisplay operatorId="john-a1b2c3d4" />);
    expect(screen.getByText("john-a1b2c3d4")).toBeTruthy();
  });

  it("shows 'Not assigned' message when operatorId is empty", async () => {
    const { default: OperatorIdDisplay } = await import(
      "@/app/components/OperatorIdDisplay"
    );
    render(<OperatorIdDisplay operatorId="" />);
    expect(screen.getByText(/not assigned/i)).toBeTruthy();
    expect(screen.getByText(/contact admin/i)).toBeTruthy();
  });

  it("has a copy button when operatorId is present", async () => {
    const { default: OperatorIdDisplay } = await import(
      "@/app/components/OperatorIdDisplay"
    );
    render(<OperatorIdDisplay operatorId="john-a1b2c3d4" />);
    expect(screen.getByRole("button", { name: /copy/i })).toBeTruthy();
  });

  it("does not show copy button when no operator ID", async () => {
    const { default: OperatorIdDisplay } = await import(
      "@/app/components/OperatorIdDisplay"
    );
    render(<OperatorIdDisplay operatorId="" />);
    expect(screen.queryByRole("button", { name: /copy/i })).toBeNull();
  });

  it("copies operator ID to clipboard on button click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { default: OperatorIdDisplay } = await import(
      "@/app/components/OperatorIdDisplay"
    );
    render(<OperatorIdDisplay operatorId="john-a1b2c3d4" />);

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("john-a1b2c3d4");
    });
  });

  it("shows copied feedback after clicking copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const { default: OperatorIdDisplay } = await import(
      "@/app/components/OperatorIdDisplay"
    );
    render(<OperatorIdDisplay operatorId="john-a1b2c3d4" />);

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => {
      expect(screen.getByText(/copied/i)).toBeTruthy();
    });
  });
});
