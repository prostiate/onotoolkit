/** A named group of 0-based page indices, used when splitting into files. */
export interface PageRangeGroup {
  label: string;
  indices: number[];
}

/**
 * Parses one page-range token (e.g. "3" or "5-8") into 0-based indices, bounded
 * by `pageCount`. Reversed ranges ("8-5") are normalised. Throws on bad input.
 */
function parseToken(token: string, pageCount: number): number[] {
  const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
  const single = token.match(/^(\d+)$/);

  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);
    if (start < 1 || end < 1 || start > pageCount || end > pageCount) {
      throw new Error(`Pages must be between 1 and ${pageCount}.`);
    }
    const [lo, hi] = start <= end ? [start, end] : [end, start];
    const out: number[] = [];
    for (let page = lo; page <= hi; page += 1) out.push(page - 1);
    return out;
  }

  if (single) {
    const page = Number(single[1]);
    if (page < 1 || page > pageCount) {
      throw new Error(`Pages must be between 1 and ${pageCount}.`);
    }
    return [page - 1];
  }

  throw new Error(`"${token}" is not a valid page or range.`);
}

/**
 * Parses a page-range string like "1-3, 5, 8-10" into a de-duplicated list of
 * 0-based page indices, preserving first-seen order.
 */
export function parsePageRanges(input: string, pageCount: number): number[] {
  const tokens = input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (tokens.length === 0) throw new Error("Enter at least one page or range.");

  const seen = new Set<number>();
  const indices: number[] = [];
  for (const token of tokens) {
    for (const index of parseToken(token, pageCount)) {
      if (!seen.has(index)) {
        seen.add(index);
        indices.push(index);
      }
    }
  }
  return indices;
}

/**
 * Parses a page-range string into one group per comma-separated token, so each
 * range becomes a separate output file when splitting to a ZIP.
 */
export function parsePageRangeGroups(input: string, pageCount: number): PageRangeGroup[] {
  const tokens = input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (tokens.length === 0) throw new Error("Enter at least one page or range.");

  return tokens.map((token) => ({
    label: token.replace(/\s+/g, ""),
    indices: parseToken(token, pageCount)
  }));
}
