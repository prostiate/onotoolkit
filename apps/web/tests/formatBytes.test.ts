import { describe, expect, it } from "vitest";
import { formatBytes, reductionPercent } from "~/utils/formatBytes";

describe("formatBytes", () => {
  it("formats across units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1)).toBe("1 B");
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe("3.0 GB");
    expect(formatBytes(2 * 1024 ** 4)).toBe("2.0 TB");
  });

  it("respects the fractionDigits argument", () => {
    expect(formatBytes(1536, 0)).toBe("2 KB");
    expect(formatBytes(1536, 2)).toBe("1.50 KB");
  });

  it("guards against invalid input", () => {
    expect(formatBytes(-1)).toBe("0 B");
    expect(formatBytes(Number.NaN)).toBe("0 B");
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("0 B");
  });
});

describe("reductionPercent", () => {
  it("computes the percentage saved and rounds", () => {
    expect(reductionPercent(1000, 250)).toBe(75);
    expect(reductionPercent(1000, 1000)).toBe(0);
    expect(reductionPercent(1000, 334)).toBe(67);
  });

  it("never returns negative when the file grows", () => {
    expect(reductionPercent(1000, 1500)).toBe(0);
  });

  it("returns 0 for invalid sizes", () => {
    expect(reductionPercent(0, 100)).toBe(0);
    expect(reductionPercent(-5, 1)).toBe(0);
  });
});
