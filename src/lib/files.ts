/** Mirrors the backend's upload middleware (src/middlewares/upload.ts): same allow-list and 10 MB limit. The server stays authoritative. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const TYPE_LABELS: Record<string, string> = {
  "image/png": "PNG", "image/jpeg": "JPEG", "image/gif": "GIF", "image/webp": "WebP", "application/pdf": "PDF", "text/plain": "Text",
  "application/msword": "Word", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.ms-excel": "Excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
};
export const ALLOWED_MIME_TYPES = Object.keys(TYPE_LABELS);
/** For <input accept>. */
export const ACCEPT_ATTR = ALLOWED_MIME_TYPES.join(",");
export const ALLOWED_SUMMARY = "Images, PDF, Word, Excel or text, up to 10 MB";

export const fileTypeLabel = (mime: string): string => TYPE_LABELS[mime] ?? (mime.split("/")[1]?.toUpperCase() || "File");
export const isImageType = (mime: string): boolean => mime.startsWith("image/");

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Client-side pre-check so people get an instant, specific message; null means "looks fine". */
export function validateFile(file: Pick<File, "type" | "size" | "name">): string | null {
  if (file.size === 0) return "That file is empty.";
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return `“${file.name}” isn't a supported type. Use images, PDF, Word, Excel or text files.`;
  if (file.size > MAX_FILE_BYTES) return `“${file.name}” is ${formatBytes(file.size)}. The limit is 10 MB.`;
  return null;
}
