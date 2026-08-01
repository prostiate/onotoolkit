/** The single method we need from the cached markdown-it instance. */
interface MarkdownRenderer {
  render(markdown: string): string;
}

/**
 * Cached markdown-it instance. It is configured to tag every top-level block with
 * a `data-source-line` attribute (1-based, matching CodeMirror line numbers) so
 * the preview can be scroll-synced to the editor. Built lazily on the client.
 */
let rendererPromise: Promise<MarkdownRenderer> | null = null;

function createRenderer(): Promise<MarkdownRenderer> {
  if (!rendererPromise) {
    rendererPromise = import("markdown-it").then(({ default: MarkdownItCtor }) => {
      const md = new MarkdownItCtor({ html: false, linkify: true, breaks: false });
      md.core.ruler.push("source_line", (state) => {
        for (const token of state.tokens) {
          if (token.map && token.level === 0) {
            token.attrSet("data-source-line", String(token.map[0] + 1));
          }
        }
      });
      return md;
    });
  }
  return rendererPromise;
}

/**
 * Markdown document conversions, run entirely in the browser. Every library is
 * imported dynamically so it stays out of the SSR bundle and only loads when
 * needed - mirrors `useJsonConvert`.
 */
export function useMarkdownConvert() {
  /** Renders Markdown to an HTML string (unsanitized), with source-line tags. */
  async function markdownToHtml(markdown: string): Promise<string> {
    const md = await createRenderer();
    return md.render(markdown);
  }

  /** Removes scripts and other unsafe nodes from an HTML string. */
  async function sanitizeHtml(html: string): Promise<string> {
    const { default: DOMPurify } = await import("dompurify");
    // DOMPurify keeps data-* attributes by default, preserving data-source-line.
    return DOMPurify.sanitize(html);
  }

  /** Converts a Markdown string to DOCX bytes. */
  async function markdownToDocxBytes(markdown: string): Promise<Uint8Array> {
    const { default: markdownDocx, Packer } = await import("markdown-docx");
    const doc = await markdownDocx(markdown);
    const blob = await Packer.toBlob(doc);
    return new Uint8Array(await blob.arrayBuffer());
  }

  /** Converts DOCX bytes to a Markdown string (mammoth -> HTML -> turndown). */
  async function docxToMarkdown(bytes: ArrayBuffer): Promise<string> {
    const mammoth = await import("mammoth/mammoth.browser");
    const { default: TurndownService } = await import("turndown");
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: bytes });
    const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
    return turndown.turndown(html);
  }

  /**
   * Renders Markdown and opens the browser print dialog (user chooses
   * "Save as PDF"). Uses an isolated hidden iframe so app styles never leak in
   * and no popup is blocked. Vector output, real text, print CSS pagination.
   */
  async function printMarkdown(markdown: string, title = "Document"): Promise<void> {
    const bodyHtml = await sanitizeHtml(await markdownToHtml(markdown));
    await usePrint().printHtml(bodyHtml, title);
  }

  return { markdownToHtml, sanitizeHtml, markdownToDocxBytes, docxToMarkdown, printMarkdown };
}
