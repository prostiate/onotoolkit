import { defineStore } from "pinia";
import type { OrganizerPage, PdfSource } from "~/types/pdf";
import { pdfFileSchema } from "~/schemas/pdfFile";
import { pdfBaseName, toImagesZipName } from "~/utils/pdf";

export type PdfToJpgStatus = "idle" | "ready" | "working" | "done" | "error";

interface PdfToJpgResult {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
}

interface PdfToJpgState {
  source: PdfSource | null;
  pages: OrganizerPage[];
  status: PdfToJpgStatus;
  scale: number;
  result: PdfToJpgResult | null;
  errorMessage: string | null;
}

export const usePdfToJpgStore = defineStore("pdfToJpg", {
  state: (): PdfToJpgState => ({
    source: null,
    pages: [],
    status: "idle",
    scale: 2,
    result: null,
    errorMessage: null
  }),
  getters: {
    isBusy: (state): boolean => state.status === "working",
    selectedCount: (state): number => state.pages.filter((page) => page.selected).length,
    pageCount: (state): number => state.source?.pageCount ?? 0
  },
  actions: {
    fail(error: unknown): void {
      this.status = "error";
      this.errorMessage = error instanceof Error ? error.message : "Something went wrong.";
    },
    setScale(scale: number): void {
      this.scale = scale;
    },
    async load(file: File): Promise<void> {
      const parsed = pdfFileSchema.safeParse(file);
      if (!parsed.success) {
        this.fail(new Error(parsed.error.issues[0]?.message ?? "Invalid file."));
        return;
      }
      this.status = "working";
      this.errorMessage = null;
      this.result = null;
      try {
        const { openSource } = usePdfPages();
        const source = await openSource(file);
        this.source = markRaw(source);
        this.pages = Array.from({ length: source.pageCount }, (_, index) => ({
          id: `${source.id}:${index}`,
          sourceId: source.id,
          pageIndex: index,
          rotation: 0,
          selected: true,
          thumbnail: null,
          loading: false
        }));
        this.status = "ready";
      } catch (error) {
        this.fail(error);
      }
    },
    async ensureThumbnail(id: string): Promise<void> {
      const page = this.pages.find((entry) => entry.id === id);
      if (!page || page.thumbnail || page.loading || !this.source) return;
      page.loading = true;
      try {
        const { renderThumbnail } = usePdfPages();
        page.thumbnail = await renderThumbnail(this.source.id, page.pageIndex);
      } catch {
        /* leave empty */
      } finally {
        page.loading = false;
      }
    },
    toggle(id: string): void {
      const page = this.pages.find((entry) => entry.id === id);
      if (page) page.selected = !page.selected;
    },
    selectAll(): void {
      for (const page of this.pages) page.selected = true;
    },
    selectNone(): void {
      for (const page of this.pages) page.selected = false;
    },
    async convert(): Promise<void> {
      if (!this.source) return;
      const source = this.source;
      const selected = this.pages.filter((page) => page.selected);
      if (selected.length === 0) {
        this.fail(new Error("Select at least one page to convert."));
        return;
      }
      this.status = "working";
      this.errorMessage = null;
      try {
        const { renderPageImage } = usePdfPages();
        const base = pdfBaseName(source.name);
        const rendered = await Promise.all(
          selected.map(async (page) => ({
            name: `${base}-page-${page.pageIndex + 1}.jpg`,
            bytes: await renderPageImage(source.id, page.pageIndex, {
              scale: this.scale,
              mimeType: "image/jpeg",
              quality: 0.85
            })
          }))
        );

        if (rendered.length === 1 && rendered[0]) {
          this.result = {
            bytes: rendered[0].bytes,
            fileName: rendered[0].name,
            mimeType: "image/jpeg"
          };
        } else {
          const files: Record<string, Uint8Array> = {};
          for (const item of rendered) files[item.name] = item.bytes;
          const { zip } = useZip();
          this.result = {
            bytes: await zip(files),
            fileName: toImagesZipName(source.name),
            mimeType: "application/zip"
          };
        }
        this.status = "done";
      } catch (error) {
        this.fail(error);
      }
    },
    backToPages(): void {
      if (this.source) {
        this.status = "ready";
        this.result = null;
        this.errorMessage = null;
      }
    },
    reset(): void {
      if (this.source) usePdfPages().release(this.source.id);
      this.source = null;
      this.pages = [];
      this.status = "idle";
      this.scale = 2;
      this.result = null;
      this.errorMessage = null;
    }
  }
});
