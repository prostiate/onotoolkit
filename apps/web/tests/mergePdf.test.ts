import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { useMergePdf } from "~/composables/useMergePdf";
import { hasPdfMagic } from "~/utils/pdf";
import { makeImageHeavyPdf } from "./support/makeSamplePdf";

describe("useMergePdf", () => {
  it("merges PDFs and sums their page counts in order", async () => {
    const a = await makeImageHeavyPdf(200, 2); // 2 pages
    const b = await makeImageHeavyPdf(200, 3); // 3 pages

    const { merge } = useMergePdf();
    const result = await merge([{ bytes: a }, { bytes: b }]);

    expect(hasPdfMagic(result.bytes)).toBe(true);
    expect(result.pageCount).toBe(5);

    // Reloading the merged output confirms a valid PDF with all pages.
    const reloaded = await PDFDocument.load(result.bytes);
    expect(reloaded.getPageCount()).toBe(5);
  });

  it("merges a single document unchanged in page count", async () => {
    const a = await makeImageHeavyPdf(200, 1);
    const { merge } = useMergePdf();
    const result = await merge([{ bytes: a }]);
    expect(result.pageCount).toBe(1);
  });
});
