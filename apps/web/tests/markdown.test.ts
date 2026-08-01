import { describe, expect, it } from "vitest";
import {
  SAMPLE_MARKDOWN,
  buildPrintDocument,
  countChars,
  countWords,
  exportFileName,
  exportMime
} from "~/utils/markdown";

describe("export metadata", () => {
  it("returns a file name per format", () => {
    expect(exportFileName("md")).toBe("document.md");
    expect(exportFileName("pdf")).toBe("document.pdf");
    expect(exportFileName("docx")).toBe("document.docx");
  });

  it("returns a MIME type per format", () => {
    expect(exportMime("md")).toBe("text/markdown");
    expect(exportMime("pdf")).toBe("application/pdf");
    expect(exportMime("docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });
});

describe("countWords", () => {
  it("counts whitespace-delimited words", () => {
    expect(countWords("hello world")).toBe(2);
    expect(countWords("  one   two\nthree ")).toBe(3);
  });

  it("returns 0 for empty or whitespace input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n  ")).toBe(0);
  });
});

describe("countChars", () => {
  it("counts every character including whitespace", () => {
    expect(countChars("abc")).toBe(3);
    expect(countChars("a b")).toBe(3);
    expect(countChars("")).toBe(0);
  });
});

describe("buildPrintDocument", () => {
  it("wraps body HTML in a full document with the escaped title", () => {
    const doc = buildPrintDocument("<h1>Hi</h1>", "My <Report>");
    expect(doc.startsWith("<!doctype html>")).toBe(true);
    expect(doc).toContain("<h1>Hi</h1>");
    expect(doc).toContain("<title>My &lt;Report&gt;</title>");
    expect(doc).toContain("@page");
    expect(doc).toContain("break-inside: avoid");
  });

  it("defaults the title when none is given", () => {
    expect(buildPrintDocument("<p>x</p>")).toContain("<title>Document</title>");
  });
});

describe("SAMPLE_MARKDOWN", () => {
  it("is non-empty and exercises common Markdown features", () => {
    expect(SAMPLE_MARKDOWN.length).toBeGreaterThan(0);
    expect(SAMPLE_MARKDOWN).toContain("# Markdown Studio");
    expect(SAMPLE_MARKDOWN).toContain("```ts");
    expect(SAMPLE_MARKDOWN).toContain("| Tool |");
  });
});
