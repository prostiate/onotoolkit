import type { PDFDocument } from "pdf-lib";
import type { PdfPageRef } from "~/types/pdf";

/**
 * Assembles output PDFs from page references using pdf-lib, entirely in the
 * browser. pdf-lib is imported dynamically so it stays out of the SSR bundle.
 * A single `assemble` powers extract, rotate, split, and page-level merge.
 */
export function usePdfBuild() {
  /**
   * Builds one PDF from an ordered list of page refs. Pages are copied from
   * their source in order; a non-zero `rotation` is added to the page's own
   * rotation. Source documents are loaded once and reused.
   */
  async function assemble(
    refs: PdfPageRef[],
    sourceBytes: Map<string, Uint8Array>
  ): Promise<Uint8Array> {
    const { PDFDocument: PdfDoc, degrees } = await import("pdf-lib");
    const out = await PdfDoc.create();
    const loaded = new Map<string, PDFDocument>();

    for (const ref of refs) {
      let src = loaded.get(ref.sourceId);
      if (!src) {
        const bytes = sourceBytes.get(ref.sourceId);
        if (!bytes) continue;
        src = await PdfDoc.load(bytes, { ignoreEncryption: true });
        loaded.set(ref.sourceId, src);
      }
      const [page] = await out.copyPages(src, [ref.pageIndex]);
      if (!page) continue;
      if (ref.rotation) {
        const current = page.getRotation().angle;
        page.setRotation(degrees((current + ref.rotation) % 360));
      }
      out.addPage(page);
    }

    return out.save();
  }

  return { assemble };
}
