/**
 * Pure text transforms behind the Markdown formatting toolbar. Each takes the
 * current document string and a selection range `[from, to)` and returns a single
 * edit (a replacement range + the text to insert) plus the resulting selection.
 * Keeping these pure makes the toolbar logic fully unit-testable without a live
 * CodeMirror instance; the editor command layer just dispatches the result.
 */

export interface MarkdownEdit {
  /** Start of the replaced range. */
  from: number;
  /** End of the replaced range. */
  to: number;
  /** Text inserted in place of the range. */
  insert: string;
  /** New selection anchor after the edit. */
  anchor: number;
  /** New selection head after the edit. */
  head: number;
}

function lineStart(doc: string, pos: number): number {
  return doc.lastIndexOf("\n", pos - 1) + 1;
}

function lineEnd(doc: string, pos: number): number {
  const idx = doc.indexOf("\n", pos);
  return idx === -1 ? doc.length : idx;
}

/**
 * Toggles an inline wrapper (e.g. `**` bold, `*` italic, `~~` strike, `` ` ``
 * code) around the selection. Recognises markers both inside and just outside
 * the selection so a second press unwraps.
 */
export function wrapInline(doc: string, from: number, to: number, marker: string): MarkdownEdit {
  const selected = doc.slice(from, to);
  const m = marker.length;

  if (selected.length >= 2 * m && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(m, selected.length - m);
    return { from, to, insert: inner, anchor: from, head: from + inner.length };
  }

  const before = doc.slice(Math.max(0, from - m), from);
  const after = doc.slice(to, to + m);
  if (before === marker && after === marker) {
    return {
      from: from - m,
      to: to + m,
      insert: selected,
      anchor: from - m,
      head: from - m + selected.length
    };
  }

  const insert = marker + selected + marker;
  return { from, to, insert, anchor: from + m, head: from + m + selected.length };
}

/**
 * Applies a heading of `level` to the line at `pos`. Re-pressing the same level
 * removes the heading; a different level replaces it.
 */
export function toggleHeading(doc: string, pos: number, level: number): MarkdownEdit {
  const start = lineStart(doc, pos);
  const end = lineEnd(doc, pos);
  const line = doc.slice(start, end);
  const match = line.match(/^(#{1,6})\s+/);
  const desired = `${"#".repeat(level)} `;

  if (match) {
    const full = match[0] ?? "";
    const hashes = match[1] ?? "";
    const rest = line.slice(full.length);
    if (hashes.length === level) {
      return { from: start, to: end, insert: rest, anchor: start, head: start + rest.length };
    }
    const insert = desired + rest;
    const caret = start + insert.length;
    return { from: start, to: end, insert, anchor: caret, head: caret };
  }

  const insert = desired + line;
  const caret = start + insert.length;
  return { from: start, to: end, insert, anchor: caret, head: caret };
}

/**
 * Toggles a per-line prefix across the selected lines: `> ` for quotes, `- ` for
 * bullet lists, or an auto-incrementing `N. ` for ordered lists. Blank lines are
 * left untouched. If every non-blank line already has the prefix, it is removed.
 */
export function toggleLinePrefix(
  doc: string,
  from: number,
  to: number,
  kind: "quote" | "bullet" | "ordered"
): MarkdownEdit {
  const start = lineStart(doc, from);
  const end = lineEnd(doc, to);
  const lines = doc.slice(start, end).split("\n");
  const prefix = kind === "quote" ? "> " : "- ";
  const orderedRe = /^\d+\.\s/;

  const nonBlank = lines.filter((l) => l.trim() !== "");
  const allPrefixed =
    nonBlank.length > 0 &&
    nonBlank.every((l) => (kind === "ordered" ? orderedRe.test(l) : l.startsWith(prefix)));

  let counter = 0;
  const out = lines.map((l) => {
    if (l.trim() === "") return l;
    if (kind === "ordered") {
      if (allPrefixed) return l.replace(orderedRe, "");
      counter += 1;
      return `${counter}. ${l}`;
    }
    if (allPrefixed) return l.startsWith(prefix) ? l.slice(prefix.length) : l;
    return `${prefix}${l}`;
  });

  const insert = out.join("\n");
  return { from: start, to: end, insert, anchor: start, head: start + insert.length };
}

/** Wraps the selection in a fenced code block, selecting the inner text. */
export function insertCodeBlock(doc: string, from: number, to: number): MarkdownEdit {
  const text = doc.slice(from, to);
  const insert = `\`\`\`\n${text}\n\`\`\``;
  const innerStart = from + 4; // ``` + newline
  return { from, to, insert, anchor: innerStart, head: innerStart + text.length };
}

/** Inserts a Markdown link, selecting the `url` placeholder. */
export function insertLink(doc: string, from: number, to: number): MarkdownEdit {
  const text = doc.slice(from, to) || "text";
  const insert = `[${text}](url)`;
  const urlStart = from + text.length + 3; // [ + text + ](
  return { from, to, insert, anchor: urlStart, head: urlStart + 3 };
}

/** Inserts a Markdown image, selecting the `url` placeholder. */
export function insertImage(doc: string, from: number, to: number): MarkdownEdit {
  const alt = doc.slice(from, to) || "alt";
  const insert = `![${alt}](url)`;
  const urlStart = from + alt.length + 4; // ![ + alt + ](
  return { from, to, insert, anchor: urlStart, head: urlStart + 3 };
}

/** Inserts a starter 2x2 Markdown table, replacing the selection. */
export function insertTable(doc: string, from: number, to: number): MarkdownEdit {
  const insert = "| Header | Header |\n| --- | --- |\n| Cell | Cell |";
  const caret = from + insert.length;
  return { from, to, insert, anchor: caret, head: caret };
}

/** Inserts a horizontal rule, replacing the selection. */
export function insertHorizontalRule(doc: string, from: number, to: number): MarkdownEdit {
  const insert = "\n---\n";
  const caret = from + insert.length;
  return { from, to, insert, anchor: caret, head: caret };
}
