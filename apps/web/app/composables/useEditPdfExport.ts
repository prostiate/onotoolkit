import type { PDFDocument, PDFPage } from "pdf-lib";
import type { EditorObject, EditorPage } from "~/types/editPdf";
import { hexToRgb } from "~/utils/image";
import { centerBoxToPdf, flipPathPoints, flipPointY } from "~/utils/pdfEditor";

export interface ExportInput {
  sourceBytes: Uint8Array;
  pages: EditorPage[];
  objects: Record<string, EditorObject[]>;
}

/** Decodes a data URL into raw bytes. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Renders the editor's overlay objects onto the original PDF pages with pdf-lib.
 * Runs entirely in the browser. Original page content is preserved (vector/
 * selectable); added images and rasterised rich text are drawn on top, and
 * shapes/lines/strokes are drawn as vectors. Coordinates are converted from the
 * editor's page space (top-left, y-down, points) to pdf-lib's (bottom-left, y-up).
 */
export function useEditPdfExport() {
  async function exportEditedPdf(input: ExportInput): Promise<Uint8Array> {
    if (import.meta.server) throw new Error("PDF export is only available in the browser.");
    const pdfLib = await import("pdf-lib");
    const { PDFDocument, rgb, degrees } = pdfLib;

    const { StandardFonts } = pdfLib;
    const src = await PDFDocument.load(input.sourceBytes, { ignoreEncryption: true });
    const out = await PDFDocument.create();

    const color = (hex: string) => {
      const { r, g, b } = hexToRgb(hex);
      return rgb(r / 255, g / 255, b / 255);
    };

    // StandardFonts need no embedding/fontkit (Latin only) - cache per document.
    const fontCache = new Map<string, Awaited<ReturnType<typeof out.embedFont>>>();
    async function font(bold: boolean, italic: boolean) {
      const name =
        bold && italic
          ? StandardFonts.HelveticaBoldOblique
          : bold
            ? StandardFonts.HelveticaBold
            : italic
              ? StandardFonts.HelveticaOblique
              : StandardFonts.Helvetica;
      let embedded = fontCache.get(name);
      if (!embedded) {
        embedded = await out.embedFont(name);
        fontCache.set(name, embedded);
      }
      return embedded;
    }

    /** Greedy word-wrap of `text` into lines that fit `maxWidth` at `size`. */
    function wrapText(
      text: string,
      f: Awaited<ReturnType<typeof out.embedFont>>,
      size: number,
      maxWidth: number
    ): string[] {
      const lines: string[] = [];
      for (const paragraph of text.split("\n")) {
        let line = "";
        for (const word of paragraph.split(/\s+/)) {
          const candidate = line ? `${line} ${word}` : word;
          if (f.widthOfTextAtSize(candidate, size) > maxWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = candidate;
          }
        }
        lines.push(line);
      }
      return lines;
    }

    async function drawObjects(page: PDFPage, list: EditorObject[], pageHeight: number) {
      for (const obj of list) {
        if (obj.type === "text" || obj.type === "image") {
          const bytes = dataUrlToBytes(obj.dataUrl);
          const image = await out.embedPng(bytes);
          const p = centerBoxToPdf(obj, pageHeight);
          page.drawImage(image, {
            x: p.x,
            y: p.y,
            width: p.width,
            height: p.height,
            rotate: degrees(p.rotate)
          });
        } else if (obj.type === "nativeText") {
          const f = await font(obj.bold, obj.italic);
          const size = obj.fontSize;
          const lineHeight = size * 1.25;
          const left = obj.cx - obj.width / 2;
          const topYUp = pageHeight - (obj.cy - obj.height / 2);
          const lines = wrapText(obj.text, f, size, obj.width);
          lines.forEach((line, i) => {
            const lineWidth = f.widthOfTextAtSize(line, size);
            const x =
              obj.align === "center"
                ? left + (obj.width - lineWidth) / 2
                : obj.align === "right"
                  ? left + obj.width - lineWidth
                  : left;
            page.drawText(line, {
              x,
              y: topYUp - lineHeight * (i + 1) + (lineHeight - size) / 2,
              size,
              font: f,
              color: color(obj.color)
            });
          });
        } else if (obj.type === "rect" || obj.type === "highlight" || obj.type === "whiteout") {
          const p = centerBoxToPdf(obj, pageHeight);
          page.drawRectangle({
            x: p.x,
            y: p.y,
            width: p.width,
            height: p.height,
            rotate: degrees(p.rotate),
            color: obj.fill === "transparent" ? undefined : color(obj.fill),
            opacity: obj.fill === "transparent" ? undefined : obj.opacity,
            borderColor: obj.strokeWidth > 0 ? color(obj.stroke) : undefined,
            borderWidth: obj.strokeWidth > 0 ? obj.strokeWidth : undefined,
            borderOpacity: obj.strokeWidth > 0 ? obj.opacity : undefined
          });
        } else if (obj.type === "ellipse") {
          const center = flipPointY(obj.cx, obj.cy, pageHeight);
          page.drawEllipse({
            x: center.x,
            y: center.y,
            xScale: obj.width / 2,
            yScale: obj.height / 2,
            rotate: degrees(-obj.rotation),
            color: obj.fill === "transparent" ? undefined : color(obj.fill),
            opacity: obj.fill === "transparent" ? undefined : obj.opacity,
            borderColor: obj.strokeWidth > 0 ? color(obj.stroke) : undefined,
            borderWidth: obj.strokeWidth > 0 ? obj.strokeWidth : undefined,
            borderOpacity: obj.strokeWidth > 0 ? obj.opacity : undefined
          });
        } else if (obj.type === "line" || obj.type === "arrow") {
          const start = flipPointY(obj.x1, obj.y1, pageHeight);
          const end = flipPointY(obj.x2, obj.y2, pageHeight);
          page.drawLine({
            start,
            end,
            thickness: obj.strokeWidth,
            color: color(obj.stroke)
          });
          if (obj.type === "arrow") {
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const head = Math.max(8, obj.strokeWidth * 4);
            for (const spread of [Math.PI / 7, -Math.PI / 7]) {
              page.drawLine({
                start: end,
                end: {
                  x: end.x - head * Math.cos(angle - spread),
                  y: end.y - head * Math.sin(angle - spread)
                },
                thickness: obj.strokeWidth,
                color: color(obj.stroke)
              });
            }
          }
        } else if (obj.type === "draw" || obj.type === "signature") {
          const pts = flipPathPoints(obj.points, pageHeight);
          for (let i = 0; i + 1 < pts.length; i += 1) {
            page.drawLine({
              start: pts[i]!,
              end: pts[i + 1]!,
              thickness: obj.strokeWidth,
              color: color(obj.stroke),
              opacity: obj.opacity
            });
          }
        }
      }
    }

    for (const meta of input.pages) {
      let page: PDFPage;
      if (meta.sourceIndex !== null && meta.sourceIndex < src.getPageCount()) {
        const [copied] = await out.copyPages(src, [meta.sourceIndex]);
        page = out.addPage(copied);
      } else {
        page = out.addPage([meta.widthPts, meta.heightPts]);
      }
      await drawObjects(page, input.objects[meta.id] ?? [], meta.heightPts);
      page.setRotation(degrees(meta.rotation));
    }

    return out.save();
  }

  return { exportEditedPdf };
}

/** Re-exported for typing convenience in callers. */
export type { PDFDocument };
