import { describe, expect, it } from "vitest";
import {
  DEFAULT_BACKGROUND_REMOVAL_QUALITY,
  backgroundRemovalQualityOption,
  backgroundRemovalQualityOptions,
  backgroundRemovalQualitySchema,
  parseBackgroundRemovalQuality
} from "~/schemas/backgroundRemover";

describe("background removal quality schema", () => {
  it("accepts the two offered qualities and rejects anything else", () => {
    expect(backgroundRemovalQualitySchema.safeParse("small").success).toBe(true);
    expect(backgroundRemovalQualitySchema.safeParse("medium").success).toBe(true);
    // "large" (isnet, 176 MB) is deliberately not exposed.
    expect(backgroundRemovalQualitySchema.safeParse("large").success).toBe(false);
    expect(backgroundRemovalQualitySchema.safeParse(null).success).toBe(false);
  });

  it("defaults to the small model so a first run is not a ~100 MB surprise", () => {
    expect(DEFAULT_BACKGROUND_REMOVAL_QUALITY).toBe("small");
    const small = backgroundRemovalQualityOption("small");
    const medium = backgroundRemovalQualityOption("medium");
    expect(small.model).toBe("isnet_quint8");
    expect(medium.model).toBe("isnet_fp16");
    expect(small.downloadBytes).toBeLessThan(medium.downloadBytes);
  });

  it("quotes each option's real first-run download (model + ONNX runtime)", () => {
    const runtimeBytes = 11_845_354;
    expect(backgroundRemovalQualityOption("small").downloadBytes).toBe(44_348_940 + runtimeBytes);
    expect(backgroundRemovalQualityOption("medium").downloadBytes).toBe(88_152_708 + runtimeBytes);
    for (const option of backgroundRemovalQualityOptions) {
      expect(backgroundRemovalQualitySchema.safeParse(option.value).success).toBe(true);
      expect(option.description.length).toBeGreaterThan(0);
    }
  });

  it("falls back to the default for missing or corrupt persisted values", () => {
    expect(parseBackgroundRemovalQuality("medium")).toBe("medium");
    expect(parseBackgroundRemovalQuality("large")).toBe(DEFAULT_BACKGROUND_REMOVAL_QUALITY);
    expect(parseBackgroundRemovalQuality(undefined)).toBe(DEFAULT_BACKGROUND_REMOVAL_QUALITY);
    expect(parseBackgroundRemovalQuality({ quality: "medium" })).toBe(
      DEFAULT_BACKGROUND_REMOVAL_QUALITY
    );
  });
});
