/**
 * Phase 2 — Zip helper utilities (zip-helper.ts)
 *
 * Tests for: zipFiles (multi-file zip, progress callback, single file),
 * getFilesFromDataTransferItems (drag-and-drop flat files, directory recursion).
 *
 * Workers are mocked to avoid real worker instantiation in tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Worker and WorkerPool ────────────────────────────────────────

const mockExecute = vi.fn().mockResolvedValue(new Uint8Array([80, 75, 5, 6]));
const mockTerminate = vi.fn();
const mockIsActive = vi.fn().mockReturnValue(true);

vi.mock("@/lib/utils/worker-pool", () => {
  return {
    WorkerPool: class MockWorkerPool {
      execute = mockExecute;
      terminate = mockTerminate;
      isActive = mockIsActive;
    },
  };
});

import { zipFiles, getFilesFromDataTransferItems } from "../zip-helper";

// ─── Helpers ────────────────────────────────────────────────────────────

function makeFile(name: string, content = "hello"): File {
  return new File([content], name, { type: "text/plain" });
}

describe("zip-helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue(new Uint8Array([80, 75, 5, 6]));
  });

  // ─── zipFiles ─────────────────────────────────────────────────────────

  describe("zipFiles", () => {
    it("returns a File with application/zip type", async () => {
      const files = [makeFile("a.txt"), makeFile("b.txt")];
      const result = await zipFiles(files);

      expect(result).toBeInstanceOf(File);
      expect(result.type).toBe("application/zip");
      expect(result.name).toMatch(/^archive_\d+\.zip$/);
    });

    it("calls worker pool execute with file data", async () => {
      const files = [makeFile("a.txt", "AAA"), makeFile("b.txt", "BBB")];
      await zipFiles(files);

      expect(mockExecute).toHaveBeenCalledWith(
        "zip",
        expect.objectContaining({
          files: expect.arrayContaining([
            expect.objectContaining({ path: "a.txt" }),
            expect.objectContaining({ path: "b.txt" }),
          ]),
        }),
        expect.any(Function)
      );
    });

    it("calls onProgress with 100 on completion", async () => {
      const onProgress = vi.fn();
      await zipFiles([makeFile("x.txt")], onProgress);

      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it("handles worker payload objects and preserves archive bytes", async () => {
      const zipBytes = new Uint8Array([80, 75, 3, 4, 1, 2, 3, 4]);
      mockExecute.mockResolvedValueOnce({ data: zipBytes, progress: 100 });

      const result = await zipFiles([makeFile("a.txt", "AAA"), makeFile("b.txt", "BBB")]);

      expect(result.size).toBe(zipBytes.length);
      const archiveBytes = new Uint8Array(await result.arrayBuffer());
      expect(Array.from(archiveBytes)).toEqual(Array.from(zipBytes));
    });

    it("uses webkitRelativePath as the key when available", async () => {
      const file = makeFile("subfolder/image.png");
      Object.defineProperty(file, "webkitRelativePath", {
        value: "folder/image.png",
        writable: true,
      });

      await zipFiles([file]);

      const executeCall = mockExecute.mock.calls[mockExecute.mock.calls.length - 1];
      const filesArg = executeCall[1].files;
      expect(filesArg[0].path).toBe("folder/image.png");
    });

    it("falls back to file.name when webkitRelativePath is empty", async () => {
      const file = makeFile("plain.txt");
      await zipFiles([file]);

      const executeCall = mockExecute.mock.calls[mockExecute.mock.calls.length - 1];
      const filesArg = executeCall[1].files;
      expect(filesArg[0].path).toBe("plain.txt");
    });

    it("rejects when worker returns an error", async () => {
      mockExecute.mockRejectedValueOnce(new Error("Compression failed"));

      await expect(zipFiles([makeFile("bad.txt")])).rejects.toThrow("Compression failed");
    });

    it("rejects when worker response does not include binary data", async () => {
      mockExecute.mockResolvedValueOnce({ progress: 100 });

      await expect(zipFiles([makeFile("bad-payload.txt")])).rejects.toThrow(
        "Invalid ZIP worker response"
      );
    });

    it("works with a single file", async () => {
      const result = await zipFiles([makeFile("only.txt")]);
      expect(result).toBeInstanceOf(File);
    });

    it("uses worker for compression", async () => {
      await zipFiles([makeFile("fast.txt")]);

      expect(mockExecute).toHaveBeenCalledWith("zip", expect.any(Object), expect.any(Function));
    });
  });

  // ─── getFilesFromDataTransferItems ────────────────────────────────────

  describe("getFilesFromDataTransferItems", () => {
    function makeFileEntry(file: File): FileSystemFileEntry {
      return {
        isFile: true,
        isDirectory: false,
        name: file.name,
        fullPath: `/${file.name}`,
        file: (success: (f: File) => void) => success(file),
      } as unknown as FileSystemFileEntry;
    }

    function makeDataTransferItemList(entries: (FileSystemEntry | null)[]): DataTransferItemList {
      const obj: Record<string | symbol, unknown> & { length: number } = {
        length: entries.length,
        [Symbol.iterator]: function* () {
          for (let i = 0; i < entries.length; i++) {
            yield (obj as Record<number, unknown>)[i];
          }
        },
      };
      entries.forEach((entry, i) => {
        (obj as Record<number, unknown>)[i] = { webkitGetAsEntry: () => entry };
      });
      return obj as unknown as DataTransferItemList;
    }

    it("returns files from flat DataTransferItemList", async () => {
      const f1 = makeFile("drop1.txt");
      const f2 = makeFile("drop2.txt");

      const items = makeDataTransferItemList([makeFileEntry(f1), makeFileEntry(f2)]);

      // Access via index like the real impl
      const itemsWithIndex = items as unknown as Record<
        number,
        { webkitGetAsEntry: () => FileSystemEntry }
      > & { length: number };

      const files = await getFilesFromDataTransferItems(
        itemsWithIndex as unknown as DataTransferItemList
      );

      expect(files).toHaveLength(2);
      expect(files.map((f) => f.name)).toContain("drop1.txt");
    });

    it("assigns webkitRelativePath from entry.fullPath", async () => {
      const f = makeFile("note.txt");

      const items = {
        length: 1,
        0: {
          webkitGetAsEntry: () =>
            ({
              isFile: true,
              isDirectory: false,
              fullPath: "/subdir/note.txt",
              file: (success: (fi: File) => void) => success(f),
            }) as unknown as FileSystemFileEntry,
        },
      } as unknown as DataTransferItemList;

      const files = await getFilesFromDataTransferItems(items);

      expect(files[0].webkitRelativePath).toBe("subdir/note.txt");
    });

    it("returns empty array when items list is empty", async () => {
      const items = { length: 0 } as unknown as DataTransferItemList;
      const files = await getFilesFromDataTransferItems(items);
      expect(files).toEqual([]);
    });

    it("skips entries where webkitGetAsEntry returns null", async () => {
      const items = {
        length: 1,
        0: { webkitGetAsEntry: () => null },
      } as unknown as DataTransferItemList;

      const files = await getFilesFromDataTransferItems(items);
      expect(files).toEqual([]);
    });
  });
});
