export type OutputFormat = "json" | "yaml" | "csv" | "xml";
export type IndentOption = 2 | 3 | 4 | "tab";

export interface JsonParseResult {
  ok: boolean;
  value?: unknown;
  error?: string;
}

/** Parse JSON, returning a friendly result instead of throwing. */
export function parseJson(text: string): JsonParseResult {
  if (!text.trim()) return { ok: false, error: "Empty input." };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid JSON." };
  }
}

/** The value JSON.stringify expects for a given indent option. */
export function indentValue(indent: IndentOption): number | string {
  return indent === "tab" ? "\t" : indent;
}

/** Pretty-print JSON with the given indentation. Throws on invalid input. */
export function formatJson(text: string, indent: IndentOption): string {
  const result = parseJson(text);
  if (!result.ok) throw new Error(result.error);
  return JSON.stringify(result.value, null, indentValue(indent));
}

/** Minify JSON to a single compact line. Throws on invalid input. */
export function minifyJson(text: string): string {
  const result = parseJson(text);
  if (!result.ok) throw new Error(result.error);
  return JSON.stringify(result.value);
}

/** Recursively sort object keys alphabetically (arrays keep order). */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortKeysDeep(record[key])])
    );
  }
  return value;
}

const EXTENSIONS: Record<OutputFormat, string> = {
  json: "json",
  yaml: "yaml",
  csv: "csv",
  xml: "xml"
};
const MIME: Record<OutputFormat, string> = {
  json: "application/json",
  yaml: "text/yaml",
  csv: "text/csv",
  xml: "application/xml"
};

export function outputFileName(format: OutputFormat): string {
  return `data.${EXTENSIONS[format]}`;
}
export function outputMime(format: OutputFormat): string {
  return MIME[format];
}
