import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHaptics } from "../use-haptics";

describe("useHaptics", () => {
  const mockVibrate = vi.fn();

  beforeEach(() => {
    mockVibrate.mockClear();
    Object.defineProperty(navigator, "vibrate", {
      value: mockVibrate,
      writable: true,
      configurable: true,
    });
  });

  function vibrate() {
    return renderHook(() => useHaptics()).result.current.vibrate;
  }

  // ── named patterns ────────────────────────────────────────────────────

  it("vibrates [10, 30, 10] for 'success'", () => {
    vibrate()("success");
    expect(mockVibrate).toHaveBeenCalledWith([10, 30, 10]);
  });

  it("vibrates [50, 30, 50, 30, 50] for 'error'", () => {
    vibrate()("error");
    expect(mockVibrate).toHaveBeenCalledWith([50, 30, 50, 30, 50]);
  });

  it("vibrates 50 for 'warning'", () => {
    vibrate()("warning");
    expect(mockVibrate).toHaveBeenCalledWith(50);
  });

  it("vibrates 20 for 'heavy'", () => {
    vibrate()("heavy");
    expect(mockVibrate).toHaveBeenCalledWith(20);
  });

  it("vibrates 10 for 'medium'", () => {
    vibrate()("medium");
    expect(mockVibrate).toHaveBeenCalledWith(10);
  });

  it("vibrates 5 for 'light'", () => {
    vibrate()("light");
    expect(mockVibrate).toHaveBeenCalledWith(5);
  });

  // ── pass-through ──────────────────────────────────────────────────────

  it("passes a raw number directly to navigator.vibrate", () => {
    vibrate()(250);
    expect(mockVibrate).toHaveBeenCalledWith(250);
  });

  it("passes a number[] directly to navigator.vibrate", () => {
    vibrate()([100, 50, 100]);
    expect(mockVibrate).toHaveBeenCalledWith([100, 50, 100]);
  });

  // ── no-op when unsupported ────────────────────────────────────────────

  it("does not throw and does not call vibrate when navigator.vibrate is absent", () => {
    Object.defineProperty(navigator, "vibrate", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(() => vibrate()("success")).not.toThrow();
    expect(mockVibrate).not.toHaveBeenCalled();
  });
});
