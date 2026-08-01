import { describe, expect, it } from "vitest";
import {
  insertCodeBlock,
  insertImage,
  insertLink,
  insertTable,
  toggleHeading,
  toggleLinePrefix,
  wrapInline
} from "~/utils/markdownCommands";

function apply(doc: string, edit: { from: number; to: number; insert: string }): string {
  return doc.slice(0, edit.from) + edit.insert + doc.slice(edit.to);
}

describe("wrapInline", () => {
  it("wraps the selection and selects the inner text", () => {
    const doc = "hello world";
    const edit = wrapInline(doc, 0, 5, "**");
    expect(apply(doc, edit)).toBe("**hello** world");
    expect([edit.anchor, edit.head]).toEqual([2, 7]);
  });

  it("unwraps when the selection already includes the markers", () => {
    const doc = "**hello** world";
    const edit = wrapInline(doc, 0, 9, "**");
    expect(apply(doc, edit)).toBe("hello world");
  });

  it("unwraps when the markers sit just outside the selection", () => {
    const doc = "**hello** world";
    const edit = wrapInline(doc, 2, 7, "**");
    expect(apply(doc, edit)).toBe("hello world");
  });

  it("inserts empty markers with the cursor between them", () => {
    const edit = wrapInline("", 0, 0, "`");
    expect(apply("", edit)).toBe("``");
    expect([edit.anchor, edit.head]).toEqual([1, 1]);
  });
});

describe("toggleHeading", () => {
  it("adds a heading to a plain line", () => {
    const doc = "Title";
    expect(apply(doc, toggleHeading(doc, 0, 2))).toBe("## Title");
  });

  it("removes the heading when the same level is toggled", () => {
    const doc = "## Title";
    expect(apply(doc, toggleHeading(doc, 3, 2))).toBe("Title");
  });

  it("changes level when a different level is chosen", () => {
    const doc = "## Title";
    expect(apply(doc, toggleHeading(doc, 3, 1))).toBe("# Title");
  });

  it("operates on the line containing the cursor", () => {
    const doc = "a\nb";
    expect(apply(doc, toggleHeading(doc, 2, 1))).toBe("a\n# b");
  });
});

describe("toggleLinePrefix", () => {
  it("adds a quote prefix to each selected line", () => {
    const doc = "one\ntwo";
    expect(apply(doc, toggleLinePrefix(doc, 0, doc.length, "quote"))).toBe("> one\n> two");
  });

  it("removes the quote prefix when all lines already have it", () => {
    const doc = "> one\n> two";
    expect(apply(doc, toggleLinePrefix(doc, 0, doc.length, "quote"))).toBe("one\ntwo");
  });

  it("numbers ordered list items", () => {
    const doc = "a\nb\nc";
    expect(apply(doc, toggleLinePrefix(doc, 0, doc.length, "ordered"))).toBe("1. a\n2. b\n3. c");
  });

  it("adds bullet prefixes and skips blank lines", () => {
    const doc = "a\n\nb";
    expect(apply(doc, toggleLinePrefix(doc, 0, doc.length, "bullet"))).toBe("- a\n\n- b");
  });
});

describe("block inserts", () => {
  it("wraps a code block around the selection", () => {
    const doc = "x = 1";
    expect(apply(doc, insertCodeBlock(doc, 0, doc.length))).toBe("```\nx = 1\n```");
  });

  it("builds a link using the selection as text and selecting url", () => {
    const doc = "Nuxt";
    const edit = insertLink(doc, 0, 4);
    expect(apply(doc, edit)).toBe("[Nuxt](url)");
    expect(doc.length ? edit.head - edit.anchor : 0).toBe(3);
  });

  it("builds an image with an alt placeholder", () => {
    const edit = insertImage("", 0, 0);
    expect(apply("", edit)).toBe("![alt](url)");
  });

  it("inserts a starter table", () => {
    const out = apply("", insertTable("", 0, 0));
    expect(out).toContain("| Header | Header |");
    expect(out).toContain("| --- | --- |");
  });
});
