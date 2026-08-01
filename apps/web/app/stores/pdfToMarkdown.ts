import { defineStore } from "pinia";
import { pdfFileSchema } from "~/schemas/pdfFile";
import { exportMime } from "~/utils/markdown";
import { stripExtension } from "~/utils/pdf";

export type PdfToMarkdownStatus = "idle" | "working" | "ready" | "error";

interface PdfToMarkdownState {
  status: PdfToMarkdownStatus;
  markdown: string;
  fileName: string | null;
  busy: boolean;
  errorMessage: string | null;
}

export const usePdfToMarkdownStore = defineStore("pdfToMarkdown", {
  state: (): PdfToMarkdownState => ({
    status: "idle",
    markdown: "",
    fileName: null,
    busy: false,
    errorMessage: null
  }),
  getters: {
    baseName: (state): string => stripExtension(state.fileName ?? "document")
  },
  actions: {
    setMarkdown(value: string): void {
      this.markdown = value;
    },
    async load(file: File): Promise<void> {
      const parsed = pdfFileSchema.safeParse(file);
      if (!parsed.success) {
        this.status = "error";
        this.errorMessage = parsed.error.issues[0]?.message ?? "Invalid file.";
        return;
      }
      this.status = "working";
      this.errorMessage = null;
      try {
        const { extractMarkdown } = usePdfExtract();
        const bytes = new Uint8Array(await file.arrayBuffer());
        const markdown = await extractMarkdown(bytes);
        this.fileName = file.name;
        if (markdown.trim().length === 0) {
          this.status = "error";
          this.errorMessage =
            "No selectable text was found. This PDF may be scanned (image-only), which needs OCR.";
          return;
        }
        this.markdown = markdown;
        this.status = "ready";
      } catch (error) {
        this.status = "error";
        this.errorMessage = error instanceof Error ? error.message : "Could not read this PDF.";
      }
    },
    exportMarkdown(): void {
      useDownload().download(this.markdown, `${this.baseName}.md`, "text/markdown");
    },
    async savePdf(): Promise<void> {
      this.busy = true;
      try {
        const { markdownToHtml, sanitizeHtml } = useMarkdownConvert();
        const body = await sanitizeHtml(await markdownToHtml(this.markdown));
        await usePrint().printHtml(body, this.baseName);
      } finally {
        this.busy = false;
      }
    },
    async quickPdf(): Promise<void> {
      this.busy = true;
      try {
        const { markdownToHtml, sanitizeHtml } = useMarkdownConvert();
        const body = await sanitizeHtml(await markdownToHtml(this.markdown));
        await usePrint().downloadPdf(body, `${this.baseName}.pdf`);
      } finally {
        this.busy = false;
      }
    },
    async exportWord(): Promise<void> {
      this.busy = true;
      try {
        const { markdownToDocxBytes } = useMarkdownConvert();
        const bytes = await markdownToDocxBytes(this.markdown);
        useFileDownload().download(bytes, `${this.baseName}.docx`, exportMime("docx"));
      } catch (error) {
        this.errorMessage =
          error instanceof Error ? error.message : "Could not build the Word file.";
      } finally {
        this.busy = false;
      }
    },
    reset(): void {
      this.status = "idle";
      this.markdown = "";
      this.fileName = null;
      this.busy = false;
      this.errorMessage = null;
    }
  }
});
