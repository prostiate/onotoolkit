import { defineStore } from "pinia";
import type { OrganizerPage, PdfSource } from "~/types/pdf";
import { pdfFileSchema } from "~/schemas/pdfFile";
import { toRotatedFileName } from "~/utils/pdf";

export type RotateStatus = "idle" | "ready" | "working" | "done" | "error";

interface RotateResult {
  bytes: Uint8Array;
  fileName: string;
}

interface RotateState {
  source: PdfSource | null;
  pages: OrganizerPage[];
  status: RotateStatus;
  result: RotateResult | null;
  errorMessage: string | null;
}

function rotateBy(current: number, direction: -1 | 1): number {
  return (current + direction * 90 + 360) % 360;
}

export const useRotateStore = defineStore("rotate", {
  state: (): RotateState => ({
    source: null,
    pages: [],
    status: "idle",
    result: null,
    errorMessage: null
  }),
  getters: {
    isBusy: (state): boolean => state.status === "working",
    pageCount: (state): number => state.source?.pageCount ?? 0,
    hasRotation: (state): boolean => state.pages.some((page) => page.rotation !== 0)
  },
  actions: {
    fail(error: unknown): void {
      this.status = "error";
      this.errorMessage = error instanceof Error ? error.message : "Something went wrong.";
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
    rotate(id: string, direction: -1 | 1): void {
      const page = this.pages.find((entry) => entry.id === id);
      if (page) page.rotation = rotateBy(page.rotation, direction);
    },
    rotateAll(direction: -1 | 1): void {
      for (const page of this.pages) page.rotation = rotateBy(page.rotation, direction);
    },
    async apply(): Promise<void> {
      if (!this.source) return;
      const source = this.source;
      this.status = "working";
      this.errorMessage = null;
      try {
        const { assemble } = usePdfBuild();
        const refs = this.pages.map((page) => ({
          sourceId: page.sourceId,
          pageIndex: page.pageIndex,
          rotation: page.rotation
        }));
        const bytes = new Map<string, Uint8Array>([[source.id, new Uint8Array(source.bytes)]]);
        this.result = {
          bytes: await assemble(refs, bytes),
          fileName: toRotatedFileName(source.name)
        };
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
      this.result = null;
      this.errorMessage = null;
    }
  }
});
