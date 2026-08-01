/**
 * Best-effort heuristics that turn positioned PDF text runs into Markdown. PDF is
 * a layout format with no semantic structure, so this reconstructs headings,
 * paragraphs, and lists from font size and position. Pure and dependency-free so
 * it can be unit-tested; the pdf.js extraction lives in `usePdfExtract`.
 *
 * Not attempted (client-side limits): tables, images, and bold/italic (pdf.js
 * font names are obfuscated). Scanned PDFs have no text layer and yield nothing.
 */

/** A single positioned text run from a PDF page. */
export interface PdfTextItem {
  text: string;
  /** Left x in PDF user space. */
  x: number;
  /** Baseline y in PDF user space (larger = higher on the page). */
  y: number;
  /** Run width in PDF user space. */
  width: number;
  /** Font size. */
  size: number;
}

interface Line {
  text: string;
  y: number;
  size: number;
}

const UNORDERED = /^[-•·*▪◦●]\s+/;
const ORDERED = /^\d+[.)]\s+/;

/** Joins the items of a single visual line, inserting spaces across gaps. */
function mergeLine(items: PdfTextItem[]): Line {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let text = "";
  let prev: PdfTextItem | null = null;
  for (const item of sorted) {
    if (prev) {
      const gap = item.x - (prev.x + prev.width);
      if (gap > prev.size * 0.25 && !text.endsWith(" ") && !item.text.startsWith(" ")) text += " ";
    }
    text += item.text;
    prev = item;
  }
  return {
    text: text.replace(/\s+/g, " ").trim(),
    size: Math.max(...items.map((i) => i.size)),
    y: items[0]?.y ?? 0
  };
}

/** Groups items into visual lines by their baseline y. */
function buildLines(items: PdfTextItem[]): Line[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const lines: Line[] = [];
  let current: PdfTextItem[] = [];
  let currentY = sorted[0]?.y ?? 0;

  for (const item of sorted) {
    const tolerance = Math.max(item.size, 4) * 0.6;
    if (current.length > 0 && Math.abs(item.y - currentY) > tolerance) {
      lines.push(mergeLine(current));
      current = [];
    }
    if (current.length === 0) currentY = item.y;
    current.push(item);
  }
  if (current.length > 0) lines.push(mergeLine(current));
  return lines.filter((line) => line.text.length > 0);
}

/** The dominant body font size, weighted by how much text uses each size. */
function bodySize(lines: Line[]): number {
  const weight = new Map<number, number>();
  for (const line of lines) {
    const size = Math.round(line.size);
    weight.set(size, (weight.get(size) ?? 0) + line.text.length);
  }
  let best = 12;
  let bestWeight = -1;
  for (const [size, w] of weight) {
    if (w > bestWeight || (w === bestWeight && size < best)) {
      best = size;
      bestWeight = w;
    }
  }
  return best || 12;
}

function headingLevel(size: number, body: number): number {
  const ratio = size / body;
  if (ratio >= 1.8) return 1;
  if (ratio >= 1.5) return 2;
  if (ratio >= 1.25) return 3;
  return 0;
}

/** Converts one page's items to Markdown. */
export function pageToMarkdown(items: PdfTextItem[]): string {
  const lines = buildLines(items);
  if (lines.length === 0) return "";
  const body = bodySize(lines);

  const blocks: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let listOrdered = false;
  let prevY: number | null = null;

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      blocks.push(paragraph.join(" "));
      paragraph = [];
    }
  };
  const flushList = (): void => {
    if (list.length > 0) {
      blocks.push(
        list.map((text, index) => (listOrdered ? `${index + 1}. ${text}` : `- ${text}`)).join("\n")
      );
      list = [];
    }
  };

  for (const line of lines) {
    const level = headingLevel(line.size, body);
    const isUnordered = UNORDERED.test(line.text);
    const isOrdered = ORDERED.test(line.text);

    if (level > 0) {
      flushParagraph();
      flushList();
      blocks.push(`${"#".repeat(level)} ${line.text}`);
    } else if (isUnordered || isOrdered) {
      flushParagraph();
      if (list.length > 0 && listOrdered !== isOrdered) flushList();
      listOrdered = isOrdered;
      list.push(line.text.replace(isOrdered ? ORDERED : UNORDERED, ""));
    } else {
      flushList();
      if (prevY !== null && paragraph.length > 0 && prevY - line.y > body * 1.8) flushParagraph();
      paragraph.push(line.text);
    }
    prevY = line.y;
  }
  flushParagraph();
  flushList();
  return blocks.join("\n\n");
}

/** Converts a whole document (array of page item-lists) to Markdown. */
export function documentToMarkdown(pages: PdfTextItem[][]): string {
  const md = pages
    .map(pageToMarkdown)
    .filter((page) => page.length > 0)
    .join("\n\n")
    .trim();
  return md.length > 0 ? `${md}\n` : "";
}
