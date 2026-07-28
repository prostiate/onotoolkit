/** Human-readable byte size, e.g. 1536 -> "1.5 KB". */
export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"] as const;
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`;
}

/**
 * Percentage size reduction from `original` to `compressed`.
 * Returns 0 when there is no reduction (or the file grew).
 */
export function reductionPercent(original: number, compressed: number): number {
  if (original <= 0 || compressed < 0) return 0;
  const reduction = ((original - compressed) / original) * 100;
  return Math.max(0, Math.round(reduction));
}
