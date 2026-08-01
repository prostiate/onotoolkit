/** Escapes text for safe interpolation into an HTML attribute or text node. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Document typography rules, scoped under the given selector. Used both by the
 * print document (scope `body`) and the offscreen container used for the
 * rasterized "quick download" (scope `.ono-print-doc`).
 */
export function printStyleSheet(scope: string): string {
  const s = scope;
  return `
  ${s} {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
    color: #111827;
    max-width: 46rem;
    margin: 0 auto;
    padding: 1rem;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  ${s} h1, ${s} h2, ${s} h3, ${s} h4, ${s} h5, ${s} h6 { line-height: 1.25; margin: 1.4em 0 0.6em; break-after: avoid; }
  ${s} h1 { font-size: 1.9rem; } ${s} h2 { font-size: 1.5rem; } ${s} h3 { font-size: 1.25rem; }
  ${s} p, ${s} ul, ${s} ol, ${s} blockquote, ${s} table, ${s} pre { margin: 0.75em 0; }
  ${s} a { color: #0e7490; }
  ${s} code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.9em;
    background: #f3f4f6;
    padding: 0.15em 0.35em;
    border-radius: 4px;
  }
  ${s} pre { background: #f3f4f6; padding: 1em; border-radius: 8px; overflow: auto; break-inside: avoid; }
  ${s} pre code { background: none; padding: 0; }
  ${s} blockquote { margin-left: 0; padding-left: 1em; border-left: 4px solid #d1d5db; color: #4b5563; }
  ${s} table { border-collapse: collapse; width: 100%; break-inside: avoid; }
  ${s} th, ${s} td { border: 1px solid #d1d5db; padding: 0.4em 0.6em; text-align: left; }
  ${s} th { background: #f3f4f6; }
  ${s} img { max-width: 100%; }
  ${s} hr { border: none; border-top: 1px solid #d1d5db; margin: 1.5em 0; }`;
}

/**
 * Wraps already-sanitized body HTML in a complete, print-ready HTML document.
 * Written to an isolated iframe for `window.print()`. Shared by the Markdown,
 * HTML->PDF, and Word->PDF tools.
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
${printStyleSheet("body")}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
