export type FileType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "executable"
  | "code"
  | "unknown";

export function getFileType(mimeType: string): FileType {
  if (!mimeType) return "unknown";
  const m = mimeType.toLowerCase();

  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (m.includes("pdf") || m.includes("word") || m.includes("document") || m.includes("text/plain"))
    return "document";
  if (
    m.includes("zip") ||
    m.includes("tar") ||
    m.includes("rar") ||
    m.includes("gzip") ||
    m.includes("compressed")
  )
    return "archive";
  if (
    m.includes("javascript") ||
    m.includes("json") ||
    m.includes("html") ||
    m.includes("css") ||
    m.includes("xml")
  )
    return "code";
  if (m.includes("exe") || m.includes("msi")) return "executable";

  return "unknown";
}

export function getFileIcon(type: FileType): string {
  switch (type) {
    case "image":
      return "image";
    case "video":
      return "video_file";
    case "audio":
      return "audio_file";
    case "document":
      return "description";
    case "archive":
      return "folder_zip";
    case "code":
      return "data_object";
    case "executable":
      return "terminal";
    default:
      return "insert_drive_file";
  }
}

export function generateImageThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        resolve(e.target.result);
      } else {
        reject(new Error("Failed to read file as data URL"));
      }
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
}
