import { defineStore } from "pinia";
import {
  SAMPLE_MARKDOWN,
  countChars,
  countWords,
  exportFileName,
  exportMime
} from "~/utils/markdown";

/** Which panes are visible: source only, preview only, or both side by side. */
export type MarkdownView = "split" | "editor" | "preview";

interface MarkdownState {
  /** Current Markdown document (the single source of truth). */
  markdown: string;
  /** Visible panes. */
  view: MarkdownView;
  /** True while an import/export conversion is running. */
  busy: boolean;
  /** Last error message, if any. */
  error: string | null;
}

export const useMarkdownStore = defineStore("markdown", {
  state: (): MarkdownState => ({
    markdown: SAMPLE_MARKDOWN,
    view: "split",
    busy: false,
    error: null
  }),
  getters: {
    words: (state): number => countWords(state.markdown),
    characters: (state): number => countChars(state.markdown)
  },
  actions: {
    fail(error: unknown): void {
      this.error = error instanceof Error ? error.message : "Something went wrong.";
    },
    setMarkdown(value: string): void {
      this.markdown = value;
    },
    setView(view: MarkdownView): void {
      this.view = view;
    },
    async importMarkdownFile(file: File): Promise<void> {
      try {
        this.setMarkdown(await file.text());
        this.error = null;
      } catch (error) {
        this.fail(error);
      }
    },
    async importDocxFile(file: File): Promise<void> {
      this.busy = true;
      this.error = null;
      try {
        const { docxToMarkdown } = useMarkdownConvert();
        const buffer = await file.arrayBuffer();
        this.setMarkdown(await docxToMarkdown(buffer));
      } catch (error) {
        this.fail(error);
      } finally {
        this.busy = false;
      }
    },
    exportMarkdown(): void {
      const { download } = useDownload();
      download(this.markdown, exportFileName("md"), exportMime("md"));
    },
    async exportPdf(title = "Document"): Promise<void> {
      this.busy = true;
      this.error = null;
      try {
        const { printMarkdown } = useMarkdownConvert();
        await printMarkdown(this.markdown, title);
      } catch (error) {
        this.fail(error);
      } finally {
        this.busy = false;
      }
    },
    async exportDocx(): Promise<void> {
      this.busy = true;
      this.error = null;
      try {
        const { markdownToDocxBytes } = useMarkdownConvert();
        const bytes = await markdownToDocxBytes(this.markdown);
        const { download } = useFileDownload();
        download(bytes, exportFileName("docx"), exportMime("docx"));
      } catch (error) {
        this.fail(error);
      } finally {
        this.busy = false;
      }
    },
    loadSample(): void {
      this.setMarkdown(SAMPLE_MARKDOWN);
      this.error = null;
    },
    clear(): void {
      this.setMarkdown("");
      this.error = null;
    }
  }
});
