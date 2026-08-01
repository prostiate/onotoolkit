import { describe, expect, it } from "vitest";
import { parsePageRangeGroups, parsePageRanges } from "~/utils/pdfPages";

describe("parsePageRanges", () => {
  it("parses singles and ranges to 0-based indices, de-duplicated in order", () => {
    expect(parsePageRanges("1-3, 5, 8-10", 10)).toEqual([0, 1, 2, 4, 7, 8, 9]);
    expect(parsePageRanges("2,2,1", 5)).toEqual([1, 0]);
  });

  it("normalises reversed ranges", () => {
    expect(parsePageRanges("3-1", 5)).toEqual([0, 1, 2]);
  });

  it("throws on out-of-bounds or invalid input", () => {
    expect(() => parsePageRanges("", 5)).toThrow();
    expect(() => parsePageRanges("0", 5)).toThrow();
    expect(() => parsePageRanges("6", 5)).toThrow();
    expect(() => parsePageRanges("1-8", 5)).toThrow();
    expect(() => parsePageRanges("abc", 5)).toThrow();
  });
});

describe("parsePageRangeGroups", () => {
  it("returns one group per comma-separated token", () => {
    const groups = parsePageRangeGroups("1-2, 4", 5);
    expect(groups).toEqual([
      { label: "1-2", indices: [0, 1] },
      { label: "4", indices: [3] }
    ]);
  });

  it("throws on empty input", () => {
    expect(() => parsePageRangeGroups("  ", 5)).toThrow();
  });
});
