import { describe, expect, it } from "vitest";
import { MAX_MERGE_FILES, mergeFileSchema, mergeFilesSchema } from "~/schemas/merge";
import { MAX_PDF_BYTES } from "~/utils/pdf";

function makeFile(size: number, name: string, type: string): File {
  const file = new File([new Uint8Array(Math.min(size, 1024))], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

const pdf = (size = 2048, name = "a.pdf") => makeFile(size, name, "application/pdf");

describe("mergeFileSchema", () => {
  it("accepts a valid PDF by mime or extension", () => {
    expect(mergeFileSchema.safeParse(pdf()).success).toBe(true);
    expect(mergeFileSchema.safeParse(makeFile(2048, "a.pdf", "")).success).toBe(true);
  });

  it("rejects empty, oversized, and non-PDF files", () => {
    expect(mergeFileSchema.safeParse(makeFile(0, "a.pdf", "application/pdf")).success).toBe(false);
    expect(
      mergeFileSchema.safeParse(makeFile(MAX_PDF_BYTES + 1, "a.pdf", "application/pdf")).success
    ).toBe(false);
    expect(mergeFileSchema.safeParse(makeFile(2048, "photo.png", "image/png")).success).toBe(false);
  });
});

describe("mergeFilesSchema", () => {
  it("requires at least two files", () => {
    expect(mergeFilesSchema.safeParse([pdf()]).success).toBe(false);
    expect(mergeFilesSchema.safeParse([pdf(), pdf(2048, "b.pdf")]).success).toBe(true);
  });

  it("rejects more than the maximum number of files", () => {
    const many = Array.from({ length: MAX_MERGE_FILES + 1 }, (_, i) => pdf(1024, `f${i}.pdf`));
    expect(mergeFilesSchema.safeParse(many).success).toBe(false);
  });

  it("rejects when the combined size exceeds the limit", () => {
    const big = [pdf(MAX_PDF_BYTES - 1, "a.pdf"), pdf(MAX_PDF_BYTES - 1, "b.pdf")];
    expect(mergeFilesSchema.safeParse(big).success).toBe(false);
  });
});
