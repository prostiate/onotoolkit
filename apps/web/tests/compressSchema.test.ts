import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPRESS_PRESET,
  compressFileSchema,
  compressOptionsSchema,
  compressPresetOptions,
  compressPresetSchema
} from "~/schemas/compress";

function makeFile(bytes: number, name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("compress schemas", () => {
  it("accepts the four known presets and rejects others", () => {
    expect(compressPresetSchema.safeParse("ebook").success).toBe(true);
    expect(compressPresetSchema.safeParse("screen").success).toBe(true);
    expect(compressPresetSchema.safeParse("ultra").success).toBe(false);
  });

  it("uses a valid default preset with matching options", () => {
    expect(compressPresetSchema.safeParse(DEFAULT_COMPRESS_PRESET).success).toBe(true);
    const values = compressPresetOptions.map((option) => option.value);
    expect(values).toContain(DEFAULT_COMPRESS_PRESET);
    expect(compressOptionsSchema.safeParse({ preset: DEFAULT_COMPRESS_PRESET }).success).toBe(true);
  });

  it("accepts a valid PDF file", () => {
    const file = makeFile(1024, "doc.pdf", "application/pdf");
    expect(compressFileSchema.safeParse(file).success).toBe(true);
  });

  it("accepts a PDF by extension even without a mime type", () => {
    const file = makeFile(1024, "doc.pdf", "");
    expect(compressFileSchema.safeParse(file).success).toBe(true);
  });

  it("rejects an empty file", () => {
    const file = makeFile(0, "doc.pdf", "application/pdf");
    const result = compressFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("rejects a non-PDF file", () => {
    const file = makeFile(1024, "photo.png", "image/png");
    expect(compressFileSchema.safeParse(file).success).toBe(false);
  });
});
