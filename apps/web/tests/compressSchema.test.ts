import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPRESS_PRESET,
  compressFileSchema,
  compressOptionsSchema,
  compressPresetOptions,
  compressPresetSchema
} from "~/schemas/compress";
import { MAX_PDF_BYTES } from "~/utils/pdf";

function makeFile(size: number, name: string, type: string): File {
  const file = new File([new Uint8Array(Math.min(size, 1024))], name, { type });
  // Override size for boundary tests without allocating huge buffers.
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("preset schema + options", () => {
  it("accepts the four presets and rejects others", () => {
    for (const p of ["screen", "ebook", "printer", "prepress"]) {
      expect(compressPresetSchema.safeParse(p).success).toBe(true);
    }
    expect(compressPresetSchema.safeParse("ultra").success).toBe(false);
  });

  it("exposes four options, each with a valid value and dpi", () => {
    expect(compressPresetOptions).toHaveLength(4);
    for (const option of compressPresetOptions) {
      expect(compressPresetSchema.safeParse(option.value).success).toBe(true);
      expect(typeof option.dpi).toBe("number");
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  it("has a valid default preset present in the options", () => {
    expect(compressPresetSchema.safeParse(DEFAULT_COMPRESS_PRESET).success).toBe(true);
    expect(compressPresetOptions.map((o) => o.value)).toContain(DEFAULT_COMPRESS_PRESET);
    expect(compressOptionsSchema.safeParse({ preset: DEFAULT_COMPRESS_PRESET }).success).toBe(true);
  });
});

describe("compressFileSchema", () => {
  it("accepts a valid PDF (by mime or by extension)", () => {
    expect(compressFileSchema.safeParse(makeFile(2048, "a.pdf", "application/pdf")).success).toBe(
      true
    );
    expect(compressFileSchema.safeParse(makeFile(2048, "a.pdf", "")).success).toBe(true);
  });

  it("rejects an empty file", () => {
    expect(compressFileSchema.safeParse(makeFile(0, "a.pdf", "application/pdf")).success).toBe(
      false
    );
  });

  it("rejects a non-PDF file", () => {
    expect(compressFileSchema.safeParse(makeFile(2048, "photo.png", "image/png")).success).toBe(
      false
    );
  });

  it("rejects a file larger than the maximum", () => {
    const result = compressFileSchema.safeParse(
      makeFile(MAX_PDF_BYTES + 1, "big.pdf", "application/pdf")
    );
    expect(result.success).toBe(false);
  });
});
