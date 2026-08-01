import { describe, expect, it } from "vitest";
import {
  MAX_PDF_BYTES,
  hasPdfExtension,
  hasPdfMagic,
  hasPdfMimeType,
  toCompressedFileName,
  toExtractedFileName,
  toMergedFileName,
  toRotatedFileName,
  toSplitZipName
} from "~/utils/pdf";

describe("hasPdfExtension", () => {
  it("detects .pdf case-insensitively and trims", () => {
    expect(hasPdfExtension("report.pdf")).toBe(true);
    expect(hasPdfExtension("REPORT.PDF")).toBe(true);
    expect(hasPdfExtension("  a.Pdf  ")).toBe(true);
  });
  it("rejects non-pdf names", () => {
    expect(hasPdfExtension("report.txt")).toBe(false);
    expect(hasPdfExtension("pdf")).toBe(false);
    expect(hasPdfExtension("a.pdf.zip")).toBe(false);
  });
});

describe("hasPdfMimeType", () => {
  it("accepts pdf mime types", () => {
    expect(hasPdfMimeType("application/pdf")).toBe(true);
    expect(hasPdfMimeType("application/x-pdf")).toBe(true);
  });
  it("rejects others and empty", () => {
    expect(hasPdfMimeType("image/png")).toBe(false);
    expect(hasPdfMimeType("")).toBe(false);
  });
});

describe("hasPdfMagic", () => {
  it("detects %PDF- within the first bytes", () => {
    expect(hasPdfMagic(new TextEncoder().encode("%PDF-1.7\n"))).toBe(true);
    expect(hasPdfMagic(new TextEncoder().encode(" %PDF-1.4"))).toBe(true);
  });
  it("rejects non-pdf bytes", () => {
    expect(hasPdfMagic(new TextEncoder().encode("hello world"))).toBe(false);
    expect(hasPdfMagic(new Uint8Array(0))).toBe(false);
  });
});

describe("toCompressedFileName", () => {
  it("derives a -compressed.pdf name", () => {
    expect(toCompressedFileName("report.pdf")).toBe("report-compressed.pdf");
    expect(toCompressedFileName("REPORT.PDF")).toBe("REPORT-compressed.pdf");
    expect(toCompressedFileName("  spaced.pdf ")).toBe("spaced-compressed.pdf");
    expect(toCompressedFileName("")).toBe("document-compressed.pdf");
  });
});

describe("toMergedFileName", () => {
  it("derives a -merged.pdf name", () => {
    expect(toMergedFileName("report.pdf")).toBe("report-merged.pdf");
    expect(toMergedFileName("  spaced.pdf ")).toBe("spaced-merged.pdf");
    expect(toMergedFileName("")).toBe("document-merged.pdf");
    expect(toMergedFileName()).toBe("document-merged.pdf");
  });
});

describe("output filenames", () => {
  it("derives rotated / extracted / split names", () => {
    expect(toRotatedFileName("report.pdf")).toBe("report-rotated.pdf");
    expect(toExtractedFileName("report.pdf")).toBe("report-extracted.pdf");
    expect(toSplitZipName("report.pdf")).toBe("report-split.zip");
    expect(toRotatedFileName("")).toBe("document-rotated.pdf");
  });
});

describe("MAX_PDF_BYTES", () => {
  it("is a positive number", () => {
    expect(typeof MAX_PDF_BYTES).toBe("number");
    expect(MAX_PDF_BYTES).toBeGreaterThan(0);
  });
});
