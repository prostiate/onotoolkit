import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PdfSource } from "~/types/pdf";

/**
 * Non-reactive registry of open pdf.js documents, keyed by source id. Keeping the
 * class instances out of Pinia state avoids reactivity/typing issues with their
 * private fields; store state holds only serialisable `PdfSource` info.
 */
const docRegistry = new Map<string, PDFDocumentProxy>();

/**
 * Loads source PDFs and renders per-page thumbnails, entirely in the browser.
 * Wraps `usePdfRender` (pdf.js) and keeps the raw bytes so the same source can
 * later be assembled with pdf-lib. Nothing is uploaded.
 */
export function usePdfPages() {
  const { openDocument, renderPage } = usePdfRender();

  /** Reads a file, opens it with pdf.js, registers the doc, and returns info. */
  async function openSource(file: File): Promise<PdfSource> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const doc = await openDocument(bytes);
    const id = crypto.randomUUID();
    docRegistry.set(id, doc);
    return { id, name: file.name, bytes, pageCount: doc.numPages };
  }

  /** Renders a single page of a registered source to a PNG data URL. */
  async function renderThumbnail(
    sourceId: string,
    pageIndex: number,
    width = 150
  ): Promise<string> {
    const doc = docRegistry.get(sourceId);
    if (!doc) throw new Error("This document is no longer available.");
    const { dataUrl } = await renderPage(doc, pageIndex + 1, width);
    return dataUrl;
  }

  /** Forgets a source's pdf.js document (call on reset to free memory). */
  function release(sourceId: string): void {
    docRegistry.delete(sourceId);
  }

  return { openSource, renderThumbnail, release };
}
