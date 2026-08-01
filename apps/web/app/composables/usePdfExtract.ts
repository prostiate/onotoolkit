import type { PdfTextItem } from "~/utils/pdfExtract";
import { documentToMarkdown } from "~/utils/pdfExtract";

interface RawTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

function isTextItem(item: unknown): item is RawTextItem {
  return typeof item === "object" && item !== null && "str" in item && "transform" in item;
}

/**
 * Extracts a best-effort Markdown representation of a PDF's text, entirely in the
 * browser. Uses pdf.js `getTextContent` (via `usePdfRender`) to read positioned
 * text runs, then the pure `documentToMarkdown` heuristics. No OCR - scanned
 * (image-only) PDFs have no text layer and produce nothing.
 */
export function usePdfExtract() {
  async function extractMarkdown(bytes: Uint8Array): Promise<string> {
    const { openDocument } = usePdfRender();
    const doc = await openDocument(bytes);
    const pages: PdfTextItem[][] = [];

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const items: PdfTextItem[] = [];
      for (const raw of content.items) {
        if (!isTextItem(raw) || raw.str.trim().length === 0) continue;
        const size = raw.height > 0 ? raw.height : Math.abs(raw.transform[3] ?? 0) || 12;
        items.push({
          text: raw.str,
          x: raw.transform[4] ?? 0,
          y: raw.transform[5] ?? 0,
          width: raw.width,
          size
        });
      }
      pages.push(items);
      page.cleanup();
    }

    return documentToMarkdown(pages);
  }

  return { extractMarkdown };
}
