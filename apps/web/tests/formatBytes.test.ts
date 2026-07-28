import { describe, expect, it } from "vitest";
import { formatBytes, reductionPercent } from "~/utils/formatBytes";

describe("formatBytes", () => {
  it("formats bytes, KB, MB and GB", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe("3.0 GB");
  });

  it("guards against invalid input", () => {
    expect(formatBytes(-1)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
  });
});

describe("reductionPercent", () => {
  it("computes the percentage saved", () => {
    expect(reductionPercent(1000, 250)).toBe(75);
    expect(reductionPercent(1000, 1000)).toBe(0);
  });

  it("never returns a negative reduction when the file grows", () => {
    expect(reductionPercent(1000, 1500)).toBe(0);
  });

  it("returns 0 for invalid sizes", () => {
    expect(reductionPercent(0, 100)).toBe(0);
  });
});
