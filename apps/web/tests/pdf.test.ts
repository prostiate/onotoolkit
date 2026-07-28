import { describe, expect, it } from "vitest";
import { hasPdfExtension, hasPdfMagic, hasPdfMimeType, toCompressedFileName } from "~/utils/pdf";

describe("pdf helpers", () => {
  it("detects a .pdf extension case-insensitively", () => {
    expect(hasPdfExtension("report.pdf")).toBe(true);
    expect(hasPdfExtension("REPORT.PDF")).toBe(true);
    expect(hasPdfExtension("report.txt")).toBe(false);
  });

  it("detects PDF mime types", () => {
    expect(hasPdfMimeType("application/pdf")).toBe(true);
    expect(hasPdfMimeType("application/x-pdf")).toBe(true);
    expect(hasPdfMimeType("image/png")).toBe(false);
    expect(hasPdfMimeType("")).toBe(false);
  });

  it("detects the %PDF- magic header", () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n...");
    const notPdf = new TextEncoder().encode("hello world");
    expect(hasPdfMagic(pdf)).toBe(true);
    expect(hasPdfMagic(notPdf)).toBe(false);
  });

  it("derives a compressed filename", () => {
    expect(toCompressedFileName("report.pdf")).toBe("report-compressed.pdf");
    expect(toCompressedFileName("REPORT.PDF")).toBe("REPORT-compressed.pdf");
    expect(toCompressedFileName("")).toBe("document-compressed.pdf");
  });
});
