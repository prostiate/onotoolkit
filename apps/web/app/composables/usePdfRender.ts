import type { PDFDocumentProxy } from "pdfjs-dist";

export interface RenderedPage {
  dataUrl: string;
  width: number;
  height: number;
}

let workerConfigured = false;

/**
 * Renders PDF pages to images entirely in the browser using pdf.js. The library
 * and its worker are imported dynamically so they never enter the SSR server
 * bundle, and are configured once per session.
 */
export function usePdfRender() {
  async function loadLibrary() {
    const pdfjs = await import("pdfjs-dist");
    if (!workerConfigured) {
      const { default: PdfWorker } = await import("pdfjs-dist/build/pdf.worker.min.mjs?worker");
      pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
      workerConfigured = true;
    }
    return pdfjs;
  }

  async function openDocument(bytes: Uint8Array): Promise<PDFDocumentProxy> {
    const pdfjs = await loadLibrary();
    // Clone the bytes: pdf.js takes ownership of the buffer it is given.
    const data = bytes.slice();
    return pdfjs.getDocument({ data }).promise;
  }

  async function renderPage(
    doc: PDFDocumentProxy,
    pageNumber: number,
    targetWidth: number
  ): Promise<RenderedPage> {
    const page = await doc.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const scale = targetWidth / base.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) throw new Error("Canvas 2D context is unavailable.");

    await page.render({ canvas, canvasContext, viewport }).promise;
    page.cleanup();

    return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
  }

  /** Renders a page at a given scale and returns encoded image bytes (JPEG/PNG). */
  async function renderPageToBytes(
    doc: PDFDocumentProxy,
    pageNumber: number,
    options: { scale?: number; mimeType?: string; quality?: number } = {}
  ): Promise<Uint8Array> {
    const { scale = 2, mimeType = "image/jpeg", quality = 0.85 } = options;
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) throw new Error("Canvas 2D context is unavailable.");

    await page.render({ canvas, canvasContext, viewport }).promise;
    page.cleanup();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, quality)
    );
    if (!blob) throw new Error("Could not render the page image.");
    return new Uint8Array(await blob.arrayBuffer());
  }

  return { openDocument, renderPage, renderPageToBytes };
}
