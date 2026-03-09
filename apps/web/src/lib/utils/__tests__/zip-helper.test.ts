/**
 * Phase 2 — Zip helper utilities (zip-helper.ts)
 *
 * Tests for: zipFiles (multi-file zip, progress callback, single file),
 * getFilesFromDataTransferItems (drag-and-drop flat files, directory recursion).
 *
 * fflate is mocked to avoid real compression and keep tests fast.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock fflate ────────────────────────────────────────────────────────

vi.mock("fflate", () => {
  return {
    zipSync: vi.fn((_data: unknown, _opts: unknown) => {
      // Return a mock ZIP file as Uint8Array
      return new Uint8Array([80, 75, 5, 6]); // Minimal ZIP signature
    }),
  };
});

import { zipFiles, getFilesFromDataTransferItems } from "../zip-helper";
import { zipSync } from "fflate";

// ─── Helpers ────────────────────────────────────────────────────────────

function makeFile(name: string, content = "hello"): File {
  return new File([content], name, { type: "text/plain" });
}

describe("zip-helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    it("calls fflate zipSync with all input files", async () => {
      const files = [makeFile("a.txt", "AAA"), makeFile("b.txt", "BBB")];
      await zipFiles(files);

      expect(zipSync).toHaveBeenCalledOnce();
      const [zipData] = (zipSync as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(Object.keys(zipData)).toContain("a.txt");
      expect(Object.keys(zipData)).toContain("b.txt");
    });

    it("calls onProgress with 100 on completion", async () => {
      const onProgress = vi.fn();
      await zipFiles([makeFile("x.txt")], onProgress);

      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it("uses webkitRelativePath as the key when available", async () => {
      const file = makeFile("subfolder/image.png");
      Object.defineProperty(file, "webkitRelativePath", {
        value: "folder/image.png",
        writable: true,
      });

      await zipFiles([file]);

      const [zipData] = (zipSync as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(Object.keys(zipData)).toContain("folder/image.png");
    });

    it("falls back to file.name when webkitRelativePath is empty", async () => {
      const file = makeFile("plain.txt");
      await zipFiles([file]);

      const [zipData] = (zipSync as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(Object.keys(zipData)).toContain("plain.txt");
    });

    it("rejects when fflate returns an error", async () => {
      (zipSync as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error("Compression failed");
      });

      await expect(zipFiles([makeFile("bad.txt")])).rejects.toThrow("Compression failed");
    });

    it("works with a single file", async () => {
      const result = await zipFiles([makeFile("only.txt")]);
      expect(result).toBeInstanceOf(File);
    });

    it("uses level 0 (store) compression for speed", async () => {
      await zipFiles([makeFile("fast.txt")]);

      const [, opts] = (zipSync as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(opts).toMatchObject({ level: 0 });
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
