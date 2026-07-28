/** Maximum file size we accept before warning the user (device-RAM bound). */
export const MAX_PDF_BYTES = 500 * 1024 * 1024;

const PDF_MAGIC = "%PDF-";

/** True when the filename ends in .pdf (case-insensitive). */
export function hasPdfExtension(name: string): boolean {
  return /\.pdf$/i.test(name.trim());
}

/** True when the MIME type looks like a PDF. Empty types are treated as unknown. */
export function hasPdfMimeType(type: string): boolean {
  return type === "application/pdf" || type === "application/x-pdf";
}

/** Verifies the leading bytes contain the %PDF- magic header. */
export function hasPdfMagic(bytes: Uint8Array): boolean {
  const header = new TextDecoder("latin1").decode(bytes.slice(0, 8));
  return header.includes(PDF_MAGIC);
}

/** Suggests a "<name>-compressed.pdf" output filename from an input name. */
export function toCompressedFileName(name: string): string {
  const base = name.replace(/\.pdf$/i, "").trim() || "document";
  return `${base}-compressed.pdf`;
}
