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

/** Escapes text for safe interpolation into an HTML attribute or text node. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Wraps already-rendered, already-sanitized body HTML in a complete, print-ready
 * HTML document. Print CSS keeps code blocks, tables, and headings from breaking
 * awkwardly across pages. Written to an isolated iframe for `window.print()`.
 */
export function buildPrintDocument(bodyHtml: string, title = "Document"): string {
  const safeTitle = escapeHtml(title);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<style>
  @page { margin: 20mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
    color: #111827;
    max-width: 46rem;
    margin: 0 auto;
    padding: 1rem;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin: 1.4em 0 0.6em; break-after: avoid; }
  h1 { font-size: 1.9rem; } h2 { font-size: 1.5rem; } h3 { font-size: 1.25rem; }
  p, ul, ol, blockquote, table, pre { margin: 0.75em 0; }
  a { color: #0e7490; }
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.9em;
    background: #f3f4f6;
    padding: 0.15em 0.35em;
    border-radius: 4px;
  }
  pre {
    background: #f3f4f6;
    padding: 1em;
    border-radius: 8px;
    overflow: auto;
    break-inside: avoid;
  }
  pre code { background: none; padding: 0; }
  blockquote {
    margin-left: 0;
    padding-left: 1em;
    border-left: 4px solid #d1d5db;
    color: #4b5563;
  }
  table { border-collapse: collapse; width: 100%; break-inside: avoid; }
  th, td { border: 1px solid #d1d5db; padding: 0.4em 0.6em; text-align: left; }
  th { background: #f3f4f6; }
  img { max-width: 100%; }
  hr { border: none; border-top: 1px solid #d1d5db; margin: 1.5em 0; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
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
