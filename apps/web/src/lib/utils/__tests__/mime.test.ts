/**
 * Phase 1 — MIME Types (mime.ts)
 *
 * Tests for: getMimeType
 *
 * Validates: common extensions, unknown fallback, case insensitivity,
 * double extensions, edge cases.
 */
import { describe, it, expect } from "vitest";
import { getMimeType } from "../mime";

describe("getMimeType", () => {
  // ─── Image types ───────────────────────────────────────────────────────

  it.each([
    ["photo.jpg", "image/jpeg"],
    ["photo.jpeg", "image/jpeg"],
    ["image.png", "image/png"],
    ["animation.gif", "image/gif"],
    ["modern.webp", "image/webp"],
    ["vector.svg", "image/svg+xml"],
    ["next-gen.avif", "image/avif"],
    ["favicon.ico", "image/x-icon"],
  ])("returns correct MIME for image: %s → %s", (filename, expected) => {
    expect(getMimeType(filename)).toBe(expected);
  });

  // ─── Document types ───────────────────────────────────────────────────

  it.each([
    ["readme.pdf", "application/pdf"],
    ["notes.txt", "text/plain"],
    ["data.csv", "text/csv"],
    ["report.doc", "application/msword"],
    ["report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ["sheet.xls", "application/vnd.ms-excel"],
    ["sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ])("returns correct MIME for document: %s → %s", (filename, expected) => {
    expect(getMimeType(filename)).toBe(expected);
  });

  // ─── Audio types ──────────────────────────────────────────────────────

  it.each([
    ["song.mp3", "audio/mpeg"],
    ["sound.wav", "audio/wav"],
    ["voice.ogg", "audio/ogg"],
    ["lossless.flac", "audio/flac"],
  ])("returns correct MIME for audio: %s → %s", (filename, expected) => {
    expect(getMimeType(filename)).toBe(expected);
  });

  // ─── Video types ──────────────────────────────────────────────────────

  it.each([
    ["video.mp4", "video/mp4"],
    ["clip.webm", "video/webm"],
    ["movie.mov", "video/quicktime"],
    ["film.mkv", "video/x-matroska"],
  ])("returns correct MIME for video: %s → %s", (filename, expected) => {
    expect(getMimeType(filename)).toBe(expected);
  });

  // ─── Code types ───────────────────────────────────────────────────────

  it.each([
    ["app.ts", "text/typescript"],
    ["app.tsx", "text/typescript-jsx"],
    ["app.js", "text/javascript"],
    ["app.jsx", "text/javascript"],
    ["data.json", "application/json"],
    ["module.wasm", "application/wasm"],
  ])("returns correct MIME for code: %s → %s", (filename, expected) => {
    expect(getMimeType(filename)).toBe(expected);
  });

  // ─── Archive types (all fall back to octet-stream) ────────────────────

  it.each([
    ["archive.zip", "application/octet-stream"],
    ["archive.tar", "application/octet-stream"],
    ["archive.gz", "application/octet-stream"],
    ["archive.7z", "application/octet-stream"],
    ["archive.rar", "application/octet-stream"],
  ])("returns octet-stream for archive: %s → %s", (filename, expected) => {
    expect(getMimeType(filename)).toBe(expected);
  });

  // ─── Unknown / fallback ───────────────────────────────────────────────

  it("returns octet-stream for unknown extension", () => {
    expect(getMimeType("file.xyz")).toBe("application/octet-stream");
  });

  it("returns octet-stream for no extension", () => {
    expect(getMimeType("README")).toBe("application/octet-stream");
  });

  it("returns octet-stream for empty string", () => {
    expect(getMimeType("")).toBe("application/octet-stream");
  });

  // ─── Case insensitivity ───────────────────────────────────────────────

  it("is case-insensitive for extensions", () => {
    expect(getMimeType("PHOTO.JPG")).toBe("image/jpeg");
    expect(getMimeType("PHOTO.Jpg")).toBe("image/jpeg");
    expect(getMimeType("FILE.PDF")).toBe("application/pdf");
  });

  // ─── Double / complex extensions ──────────────────────────────────────

  it("handles double extensions by using the last part (.tar.gz → gz)", () => {
    expect(getMimeType("archive.tar.gz")).toBe("application/octet-stream");
  });

  it("handles dotfiles", () => {
    expect(getMimeType(".gitignore")).toBe("application/octet-stream");
  });

  it("handles filenames with spaces", () => {
    expect(getMimeType("my file.pdf")).toBe("application/pdf");
  });

  it("handles filenames with multiple dots", () => {
    expect(getMimeType("my.file.name.txt")).toBe("text/plain");
  });
});
