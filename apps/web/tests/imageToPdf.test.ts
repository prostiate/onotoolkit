import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { useImageToPdf } from "~/composables/useImageToPdf";
import { hasPdfMagic } from "~/utils/pdf";
import { makeNoisePng } from "./support/makeSamplePdf";

describe("useImageToPdf.build", () => {
  it("creates one page per image sized to the image (fit mode)", async () => {
    const png = makeNoisePng(120);
    const { build } = useImageToPdf();
    const bytes = await build(
      [
        { bytes: png, type: "png" },
        { bytes: png, type: "png" }
      ],
      { pageSize: "fit", margin: "none" }
    );

    expect(hasPdfMagic(bytes)).toBe(true);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
    const { width, height } = doc.getPage(0).getSize();
    expect(Math.round(width)).toBe(120);
    expect(Math.round(height)).toBe(120);
  });

  it("uses a fixed A4 page in a4 mode", async () => {
    const png = makeNoisePng(120);
    const { build } = useImageToPdf();
    const bytes = await build([{ bytes: png, type: "png" }], { pageSize: "a4", margin: "small" });
    const doc = await PDFDocument.load(bytes);
    const { width, height } = doc.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
  });
});
