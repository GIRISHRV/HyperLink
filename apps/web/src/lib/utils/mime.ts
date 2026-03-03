/**
 * Maps a filename extension to a MIME type string.
 * Falls back to "application/octet-stream" for unknown extensions.
 */
export function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    avif: "image/avif",
    ico: "image/x-icon",
    pdf: "application/pdf",
    txt: "text/plain",
    csv: "text/csv",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mkv: "video/x-matroska",
    ts: "text/typescript",
    tsx: "text/typescript-jsx",
    js: "text/javascript",
    jsx: "text/javascript",
    wasm: "application/wasm",
    json: "application/json",
    zip: "application/octet-stream",
    tar: "application/octet-stream",
    gz: "application/octet-stream",
    "7z": "application/octet-stream",
    rar: "application/octet-stream",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}
