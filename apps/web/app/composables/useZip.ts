/**
 * Zips in-memory files entirely in the browser. fflate is imported dynamically
 * so it stays out of the SSR bundle. PDFs are already compressed, so entries are
 * stored (level 0) for speed.
 */
export function useZip() {
  async function zip(files: Record<string, Uint8Array>): Promise<Uint8Array> {
    const { zipSync } = await import("fflate");
    return zipSync(files, { level: 0 });
  }

  return { zip };
}
