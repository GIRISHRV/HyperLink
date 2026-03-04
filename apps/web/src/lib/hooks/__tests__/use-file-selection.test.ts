// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileSelection } from "@/lib/hooks/use-file-selection";

// ──────────────────────────────────────────────────────────────
// Hoisted mock state
// ──────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  // Mutable container so captures propagate across tests
  const clipboardState = { handler: null as ((f: File) => void) | null };

  const zipFilesMock = vi.fn();
  const getFilesFromDTItemsMock = vi.fn().mockResolvedValue([]);
  const validateFileSizeMock = vi
    .fn()
    .mockReturnValue({ valid: true, error: undefined });
  const formatFileSizeMock = vi.fn().mockImplementation((n: number) => `${n}B`);

  return {
    clipboardState,
    zipFilesMock,
    getFilesFromDTItemsMock,
    validateFileSizeMock,
    formatFileSizeMock,
  };
});

vi.mock("@/lib/hooks/use-clipboard-file", () => ({
  useClipboardFile: (handler: (f: File) => void) => {
    mocks.clipboardState.handler = handler;
  },
}));

vi.mock("@/lib/utils/zip-helper", () => ({
  zipFiles: (...args: unknown[]) => mocks.zipFilesMock(...args),
  getFilesFromDataTransferItems: (...args: unknown[]) =>
    mocks.getFilesFromDTItemsMock(...args),
}));

vi.mock("@repo/utils", () => ({
  validateFileSize: (...args: unknown[]) =>
    mocks.validateFileSizeMock(...args),
  formatFileSize: (...args: unknown[]) => mocks.formatFileSizeMock(...args),
}));

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function makeFile(name: string, size = 1024, type = "text/plain") {
  return new File(["x".repeat(size)], name, { type });
}

// ──────────────────────────────────────────────────────────────
// Reset
// ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mocks.clipboardState.handler = null;
  mocks.validateFileSizeMock.mockReturnValue({ valid: true, error: undefined });
  mocks.formatFileSizeMock.mockImplementation((n: number) => `${n}B`);
  mocks.zipFilesMock.mockReset();
  mocks.getFilesFromDTItemsMock.mockResolvedValue([]);
});

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe("useFileSelection", () => {
  describe("processFiles – single file", () => {
    it("sets file state for a single valid file", async () => {
      const { result } = renderHook(() => useFileSelection());

      const file = makeFile("hello.txt", 512);
      await act(async () => {
        await result.current.processFiles([file]);
      });

      expect(result.current.file).toBe(file);
      expect(result.current.error).toBe("");
    });

    it("sets error when validateFileSize returns invalid", async () => {
      mocks.validateFileSizeMock.mockReturnValue({
        valid: false,
        error: "File too large",
      });

      const { result } = renderHook(() => useFileSelection());
      const file = makeFile("big.bin", 1024);

      await act(async () => {
        await result.current.processFiles([file]);
      });

      expect(result.current.file).toBeNull();
      expect(result.current.error).toBe("File too large");
    });

    it("treats a file with webkitRelativePath as a folder and zips", async () => {
      const zippedFile = makeFile("archive.zip", 2048, "application/zip");
      mocks.zipFilesMock.mockResolvedValue(zippedFile);

      const folderFile = Object.defineProperty(makeFile("sub/a.txt"), "webkitRelativePath", {
        value: "folder/sub/a.txt",
        configurable: true,
      });

      const { result } = renderHook(() => useFileSelection());
      await act(async () => {
        await result.current.processFiles([folderFile]);
      });

      expect(mocks.zipFilesMock).toHaveBeenCalled();
      expect(result.current.file).toBe(zippedFile);
    });
  });

  describe("processFiles – multiple files (zip)", () => {
    it("zips multiple files and sets zipped file", async () => {
      const zippedFile = makeFile("archive.zip", 4096, "application/zip");
      mocks.zipFilesMock.mockResolvedValue(zippedFile);

      const files = [makeFile("a.txt"), makeFile("b.txt")];
      const { result } = renderHook(() => useFileSelection());

      await act(async () => {
        await result.current.processFiles(files);
      });

      expect(mocks.zipFilesMock).toHaveBeenCalledWith(files, expect.any(Function));
      expect(result.current.file).toBe(zippedFile);
      expect(result.current.isZipping).toBe(false);
    });

    it("sets error when zipping fails", async () => {
      mocks.zipFilesMock.mockRejectedValue(new Error("Out of memory"));

      const { result } = renderHook(() => useFileSelection());
      await act(async () => {
        await result.current.processFiles([makeFile("a.txt"), makeFile("b.txt")]);
      });

      expect(result.current.error).toBe(
        "Failed to zip files. Browser memory might be full."
      );
      expect(result.current.file).toBeNull();
    });
  });

  describe("processFiles – size limit", () => {
    it("rejects files whose total size exceeds 10 GB", async () => {
      const TEN_GB_PLUS = 11 * 1024 * 1024 * 1024;
      // We just need the size attribute to be huge; we won't actually allocate
      const bigFile = Object.defineProperty(makeFile("huge.bin"), "size", {
        value: TEN_GB_PLUS,
        configurable: true,
      });

      const { result } = renderHook(() => useFileSelection());
      await act(async () => {
        await result.current.processFiles([bigFile]);
      });

      expect(result.current.error).toMatch(/exceeds the 10GB limit/);
      expect(result.current.file).toBeNull();
    });
  });

  describe("handleFileSelect", () => {
    it("sets file from input change event", async () => {
      const file = makeFile("input.txt");
      const { result } = renderHook(() => useFileSelection());

      const fakeEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleFileSelect(fakeEvent);
      });

      expect(result.current.file).toBe(file);
    });

    it("does nothing when file list is empty", async () => {
      const { result } = renderHook(() => useFileSelection());

      const fakeEvent = {
        target: { files: [] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      await act(async () => {
        await result.current.handleFileSelect(fakeEvent);
      });

      expect(result.current.file).toBeNull();
    });
  });

  describe("removeFile", () => {
    it("clears the file from state", async () => {
      const { result } = renderHook(() => useFileSelection());
      const file = makeFile("test.txt");

      await act(async () => {
        await result.current.processFiles([file]);
      });
      expect(result.current.file).toBe(file);

      act(() => {
        result.current.removeFile();
      });

      expect(result.current.file).toBeNull();
    });
  });

  describe("drag events", () => {
    it("sets isDraggingOver=true on dragenter with Files", () => {
      const { result } = renderHook(() => useFileSelection());

      act(() => {
        const event = new Event("dragenter", { bubbles: true }) as DragEvent;
        Object.defineProperty(event, "dataTransfer", {
          value: { types: ["Files"] },
          configurable: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.isDraggingOver).toBe(true);
    });

    it("sets isDraggingOver=false on dragleave to outside window", () => {
      const { result } = renderHook(() => useFileSelection());

      // First enter
      act(() => {
        const enter = new Event("dragenter", { bubbles: true }) as DragEvent;
        Object.defineProperty(enter, "dataTransfer", {
          value: { types: ["Files"] },
          configurable: true,
        });
        window.dispatchEvent(enter);
      });

      // Then leave with relatedTarget = null (left viewport)
      act(() => {
        const leave = new Event("dragleave", { bubbles: true }) as DragEvent;
        Object.defineProperty(leave, "relatedTarget", {
          value: null,
          configurable: true,
        });
        window.dispatchEvent(leave);
      });

      expect(result.current.isDraggingOver).toBe(false);
    });

    it("processes dropped files and clears isDraggingOver", async () => {
      const droppedFile = makeFile("dropped.txt");
      mocks.getFilesFromDTItemsMock.mockResolvedValue([droppedFile]);

      const { result } = renderHook(() => useFileSelection());

      await act(async () => {
        const dropEvent = new Event("drop", { bubbles: true }) as DragEvent;
        Object.defineProperty(dropEvent, "dataTransfer", {
          value: { items: [], types: ["Files"] },
          configurable: true,
        });
        window.dispatchEvent(dropEvent);
        // Let the async drop handler resolve
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.isDraggingOver).toBe(false);
      expect(result.current.file).toBe(droppedFile);
    });
  });

  describe("clipboard paste integration", () => {
    it("processes pasted file via useClipboardFile handler", async () => {
      const { result } = renderHook(() => useFileSelection());

      // Handler should have been captured during mount
      expect(mocks.clipboardState.handler).toBeTypeOf("function");

      const pastedFile = makeFile("pasted.png", 512, "image/png");
      await act(async () => {
        mocks.clipboardState.handler!(pastedFile);
      });

      expect(result.current.file).toBe(pastedFile);
    });
  });

  describe("setFile / setError exposure", () => {
    it("setFile allows directly overriding the file", () => {
      const { result } = renderHook(() => useFileSelection());
      const file = makeFile("direct.txt");

      act(() => {
        result.current.setFile(file);
      });

      expect(result.current.file).toBe(file);
    });

    it("setError allows clearing validation errors", async () => {
      mocks.validateFileSizeMock.mockReturnValue({
        valid: false,
        error: "Too big",
      });

      const { result } = renderHook(() => useFileSelection());
      await act(async () => {
        await result.current.processFiles([makeFile("x.txt")]);
      });
      expect(result.current.error).toBe("Too big");

      act(() => {
        result.current.setError("");
      });

      expect(result.current.error).toBe("");
    });
  });
});
