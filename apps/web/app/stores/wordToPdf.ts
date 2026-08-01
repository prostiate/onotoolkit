import { defineStore } from "pinia";
import { stripExtension } from "~/utils/pdf";

export type WordToPdfStatus = "idle" | "working" | "ready" | "error";

interface WordToPdfState {
  fileName: string | null;
  html: string;
  status: WordToPdfStatus;
  errorMessage: string | null;
}

function isDocx(file: File): boolean {
  return (
    /\.docx$/i.test(file.name) ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export const useWordToPdfStore = defineStore("wordToPdf", {
  state: (): WordToPdfState => ({
    fileName: null,
    html: "",
    status: "idle",
    errorMessage: null
  }),
  actions: {
    async load(file: File): Promise<void> {
      if (!isDocx(file)) {
        this.status = "error";
        this.errorMessage = "Please choose a Word (.docx) file.";
        return;
      }
      this.status = "working";
      this.errorMessage = null;
      try {
        const { docxToHtml } = useDocx();
        const buffer = await file.arrayBuffer();
        this.html = await docxToHtml(buffer);
        this.fileName = file.name;
        this.status = "ready";
      } catch (error) {
        this.status = "error";
        this.errorMessage =
          error instanceof Error ? error.message : "Could not read this Word document.";
      }
    },
    async printPdf(): Promise<void> {
      try {
        const { sanitize } = useSanitize();
        const body = await sanitize(this.html);
        await usePrint().printHtml(body, stripExtension(this.fileName ?? "document"));
      } catch (error) {
        this.status = "error";
        this.errorMessage =
          error instanceof Error ? error.message : "Something went wrong while printing.";
      }
    },
    async quickDownload(): Promise<void> {
      try {
        const { sanitize } = useSanitize();
        const body = await sanitize(this.html);
        await usePrint().downloadPdf(body, `${stripExtension(this.fileName ?? "document")}.pdf`);
      } catch (error) {
        this.status = "error";
        this.errorMessage =
          error instanceof Error ? error.message : "Something went wrong while creating the PDF.";
      }
    },
    reset(): void {
      this.fileName = null;
      this.html = "";
      this.status = "idle";
      this.errorMessage = null;
    }
  }
});
