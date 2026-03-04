import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useClipboardFile } from "../use-clipboard-file";

// ── Helpers ──────────────────────────────────────────────────────────────────

type FakeItem = { kind: string; getAsFile: () => File | null };

function makePasteEvent(options: {
  target?: EventTarget;
  items?: FakeItem[];
  noClipboardData?: boolean;
  preventDefault?: ReturnType<typeof vi.fn>;
}) {
  const preventDefault = options.preventDefault ?? vi.fn();
  const items = options.items ?? [
    { kind: "file", getAsFile: () => new File(["x"], "file.png", { type: "image/png" }) },
  ];
  return {
    target: options.target ?? document.body,
    clipboardData: options.noClipboardData ? null : { items },
    preventDefault,
  } as unknown as ClipboardEvent;
}

describe("useClipboardFile", () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;
  let capturedHandler: ((e: ClipboardEvent) => void) | null;

  beforeEach(() => {
    capturedHandler = null;
    addSpy = vi.spyOn(window, "addEventListener").mockImplementation((type, handler) => {
      if ((type as string) === "paste") capturedHandler = handler as (e: ClipboardEvent) => void;
    });
    removeSpy = vi.spyOn(window, "removeEventListener").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── lifecycle ─────────────────────────────────────────────────────────

  it("registers paste listener on mount", () => {
    renderHook(() => useClipboardFile(vi.fn()));
    expect(addSpy).toHaveBeenCalledWith("paste", expect.any(Function));
  });

  it("removes the same paste listener on unmount", () => {
    const { unmount } = renderHook(() => useClipboardFile(vi.fn()));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("paste", expect.any(Function));
  });

  // ── file detection ────────────────────────────────────────────────────

  it("calls onFilePasted when a file item is present", () => {
    const cb = vi.fn();
    const mockFile = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    renderHook(() => useClipboardFile(cb));

    capturedHandler!(makePasteEvent({
      items: [{ kind: "file", getAsFile: () => mockFile }],
    }));

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(mockFile);
  });

  it("skips items where getAsFile returns null", () => {
    const cb = vi.fn();
    renderHook(() => useClipboardFile(cb));

    capturedHandler!(makePasteEvent({
      items: [{ kind: "file", getAsFile: () => null }],
    }));

    expect(cb).not.toHaveBeenCalled();
  });

  it("does nothing when no file items (text only)", () => {
    const cb = vi.fn();
    renderHook(() => useClipboardFile(cb));

    capturedHandler!(makePasteEvent({
      items: [{ kind: "string", getAsFile: () => null }],
    }));

    expect(cb).not.toHaveBeenCalled();
  });

  it("does nothing when clipboardData is null", () => {
    const cb = vi.fn();
    renderHook(() => useClipboardFile(cb));

    capturedHandler!(makePasteEvent({ noClipboardData: true }));

    expect(cb).not.toHaveBeenCalled();
  });

  // ── target guards ─────────────────────────────────────────────────────

  it("ignores paste when target is an <input>", () => {
    const cb = vi.fn();
    renderHook(() => useClipboardFile(cb));

    capturedHandler!(makePasteEvent({ target: document.createElement("input") }));

    expect(cb).not.toHaveBeenCalled();
  });

  it("ignores paste when target is a <textarea>", () => {
    const cb = vi.fn();
    renderHook(() => useClipboardFile(cb));

    capturedHandler!(makePasteEvent({ target: document.createElement("textarea") }));

    expect(cb).not.toHaveBeenCalled();
  });

  it("ignores paste when target is contentEditable", () => {
    const cb = vi.fn();
    renderHook(() => useClipboardFile(cb));

    const div = document.createElement("div");
    // jsdom doesn't compute isContentEditable from the attribute on detached elements
    Object.defineProperty(div, "isContentEditable", { value: true, configurable: true });
    capturedHandler!(makePasteEvent({ target: div }));

    expect(cb).not.toHaveBeenCalled();
  });

  // ── preventDefault ────────────────────────────────────────────────────

  it("calls preventDefault when a file is successfully captured", () => {
    const cb = vi.fn();
    const mockFile = new File(["x"], "x.txt");
    const preventDefault = vi.fn();
    renderHook(() => useClipboardFile(cb));

    capturedHandler!(makePasteEvent({
      items: [{ kind: "file", getAsFile: () => mockFile }],
      preventDefault,
    }));

    expect(preventDefault).toHaveBeenCalled();
  });
});
