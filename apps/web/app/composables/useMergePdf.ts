export interface MergeInput {
  bytes: Uint8Array;
}

export interface MergeResult {
  bytes: Uint8Array;
  pageCount: number;
}

/**
 * Combines several PDFs into one, entirely in the browser. pdf-lib is imported
 * dynamically so it stays out of the SSR bundle and only loads when a merge is
 * actually requested. Pages are copied in the given order.
 */
export function useMergePdf() {
  async function merge(inputs: MergeInput[]): Promise<MergeResult> {
    const { PDFDocument } = await import("pdf-lib");
    const out = await PDFDocument.create();

    for (const input of inputs) {
      const src = await PDFDocument.load(input.bytes, { ignoreEncryption: true });
      const pages = await out.copyPages(src, src.getPageIndices());
      for (const page of pages) out.addPage(page);
    }

    const bytes = await out.save();
    return { bytes, pageCount: out.getPageCount() };
  }

  return { merge };
}
