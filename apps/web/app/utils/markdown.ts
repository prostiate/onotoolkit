/**
 * Pure, dependency-free helpers for the Markdown Studio tool. Everything here is
 * synchronous string/DOM-string work so it can be unit-tested in isolation and
 * stays out of any heavy bundle. Parsing, sanitizing, and document conversion
 * live in `useMarkdownConvert` (dynamically imported) instead.
 */

/** Export targets offered by the tool. */
export type MarkdownExportFormat = "md" | "pdf" | "docx";

const EXPORT_FILE_NAMES: Record<MarkdownExportFormat, string> = {
  md: "document.md",
  pdf: "document.pdf",
  docx: "document.docx"
};

const EXPORT_MIME_TYPES: Record<MarkdownExportFormat, string> = {
  md: "text/markdown",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};

/** Default file name for a download of the given export format. */
export function exportFileName(format: MarkdownExportFormat): string {
  return EXPORT_FILE_NAMES[format];
}

/** MIME type for a download of the given export format. */
export function exportMime(format: MarkdownExportFormat): string {
  return EXPORT_MIME_TYPES[format];
}

/** Counts words in a Markdown string (whitespace-delimited, trimmed). */
export function countWords(markdown: string): number {
  const trimmed = markdown.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Counts characters in a Markdown string. */
export function countChars(markdown: string): number {
  return markdown.length;
}

/** Seed document shown on first load - exercises the common Markdown features. */
export const SAMPLE_MARKDOWN = `# Markdown Studio

Write **Markdown** with a live split-screen preview, then export to **PDF** or
**DOCX** - all in your browser. Nothing is uploaded.

## Features

- Source editor with a formatting toolbar and live preview
- Tables, code blocks, lists, and quotes
- Import \`.md\` and \`.docx\`, export to PDF / DOCX / Markdown

## Example

> Everything here runs locally on your device.

\`\`\`ts
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

| Tool | Runs in browser |
| ---- | --------------- |
| Compress PDF | Yes |
| JWT Debugger | Yes |
| Markdown Studio | Yes |
`;
