import { defineStore } from "pinia";

const SAMPLE_HTML = `<h1>HTML to PDF</h1>
<p>Paste or write <strong>HTML</strong> on the left and download it as a PDF.</p>
<h2>Features</h2>
<ul>
  <li>Runs entirely in your browser</li>
  <li>Vector, searchable output via the print dialog</li>
</ul>
<blockquote>Tip: inline &lt;style&gt; is supported; external stylesheets and URLs are not.</blockquote>`;

interface HtmlToPdfState {
  html: string;
  busy: boolean;
  errorMessage: string | null;
}

export const useHtmlToPdfStore = defineStore("htmlToPdf", {
  state: (): HtmlToPdfState => ({
    html: SAMPLE_HTML,
    busy: false,
    errorMessage: null
  }),
  actions: {
    setHtml(value: string): void {
      this.html = value;
    },
    async loadFile(file: File): Promise<void> {
      try {
        this.html = await file.text();
        this.errorMessage = null;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "Could not read this file.";
      }
    },
    loadSample(): void {
      this.html = SAMPLE_HTML;
    },
    clear(): void {
      this.html = "";
    },
    async printPdf(): Promise<void> {
      this.busy = true;
      this.errorMessage = null;
      try {
        const { sanitize } = useSanitize();
        const body = await sanitize(this.html);
        await usePrint().printHtml(body, "Document");
      } catch (error) {
        this.errorMessage =
          error instanceof Error ? error.message : "Something went wrong while printing.";
      } finally {
        this.busy = false;
      }
    },
    async quickDownload(): Promise<void> {
      this.busy = true;
      this.errorMessage = null;
      try {
        const { sanitize } = useSanitize();
        const body = await sanitize(this.html);
        await usePrint().downloadPdf(body, "document.pdf");
      } catch (error) {
        this.errorMessage =
          error instanceof Error ? error.message : "Something went wrong while creating the PDF.";
      } finally {
        this.busy = false;
      }
    }
  }
});
