import { describe, expect, it } from "vitest";
import type { PdfTextItem } from "~/utils/pdfExtract";
import { documentToMarkdown, pageToMarkdown } from "~/utils/pdfExtract";

const item = (text: string, x: number, y: number, width: number, size: number): PdfTextItem => ({
  text,
  x,
  y,
  width,
  size
});

describe("pageToMarkdown", () => {
  it("infers a heading from a larger font size", () => {
    const md = pageToMarkdown([
      item("Big Title", 72, 700, 120, 24),
      item("Body text here.", 72, 660, 90, 12)
    ]);
    expect(md).toContain("# Big Title");
    expect(md).toContain("Body text here.");
  });

  it("merges close lines into one paragraph", () => {
    const md = pageToMarkdown([
      item("This is the first", 72, 660, 90, 12),
      item("and second line.", 72, 646, 90, 12)
    ]);
    expect(md).toContain("This is the first and second line.");
  });

  it("detects bullet lists and strips the marker", () => {
    const md = pageToMarkdown([item("- One", 72, 620, 40, 12), item("- Two", 72, 605, 40, 12)]);
    expect(md).toBe("- One\n- Two");
  });

  it("numbers ordered lists sequentially", () => {
    const md = pageToMarkdown([
      item("1. Alpha", 72, 620, 50, 12),
      item("2. Beta", 72, 605, 50, 12)
    ]);
    expect(md).toBe("1. Alpha\n2. Beta");
  });

  it("returns empty string for no items", () => {
    expect(pageToMarkdown([])).toBe("");
  });
});

describe("documentToMarkdown", () => {
  it("joins pages and ends with a trailing newline", () => {
    const out = documentToMarkdown([
      [item("Page one text.", 72, 660, 90, 12)],
      [item("Page two text.", 72, 660, 90, 12)]
    ]);
    expect(out).toBe("Page one text.\n\nPage two text.\n");
  });

  it("returns empty string when there is no text", () => {
    expect(documentToMarkdown([[], []])).toBe("");
  });
});
