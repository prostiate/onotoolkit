export type PageSizeMode = "fit" | "a4" | "letter";
export type MarginMode = "none" | "small" | "large";

export interface ImageInput {
  bytes: Uint8Array;
  /** Only "jpg" and "png" are embeddable by pdf-lib; other types are converted
   * to PNG upstream (in the store) before reaching here. */
  type: "jpg" | "png";
}

export interface ImageToPdfOptions {
  pageSize: PageSizeMode;
  margin: MarginMode;
}

const PAGE_SIZES: Record<"a4" | "letter", [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792]
};

const MARGINS: Record<MarginMode, number> = {
  none: 0,
  small: 24,
  large: 54
};

/**
 * Builds a PDF from images entirely in the browser using pdf-lib (imported
 * dynamically). One image per page. "fit" sizes each page to the image; "a4"/
 * "letter" scale the image to fit a fixed page, centred, within the margin.
 */
export function useImageToPdf() {
  async function build(images: ImageInput[], options: ImageToPdfOptions): Promise<Uint8Array> {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const margin = MARGINS[options.margin];

    for (const image of images) {
      const embedded =
        image.type === "png" ? await doc.embedPng(image.bytes) : await doc.embedJpg(image.bytes);

      if (options.pageSize === "fit") {
        const page = doc.addPage([embedded.width + margin * 2, embedded.height + margin * 2]);
        page.drawImage(embedded, {
          x: margin,
          y: margin,
          width: embedded.width,
          height: embedded.height
        });
      } else {
        const [pw, ph] = PAGE_SIZES[options.pageSize];
        const availW = pw - margin * 2;
        const availH = ph - margin * 2;
        const scale = Math.min(availW / embedded.width, availH / embedded.height);
        const w = embedded.width * scale;
        const h = embedded.height * scale;
        const page = doc.addPage([pw, ph]);
        page.drawImage(embedded, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
      }
    }

    return doc.save();
  }

  return { build };
}
