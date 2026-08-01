import { defineStore } from "pinia";
import type { OrganizerPage, PdfSource } from "~/types/pdf";
import { pdfFileSchema } from "~/schemas/pdfFile";
import { parsePageRangeGroups } from "~/utils/pdfPages";
import { pdfBaseName, toExtractedFileName, toSplitZipName } from "~/utils/pdf";

export type SplitStatus = "idle" | "ready" | "working" | "done" | "error";
export type SplitRangeMode = "ranges" | "perPage";

interface SplitResult {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
}

interface SplitState {
  source: PdfSource | null;
  pages: OrganizerPage[];
  status: SplitStatus;
  rangeMode: SplitRangeMode;
  rangeInput: string;
  result: SplitResult | null;
  errorMessage: string | null;
}

export const useSplitStore = defineStore("split", {
  state: (): SplitState => ({
    source: null,
    pages: [],
    status: "idle",
    rangeMode: "ranges",
    rangeInput: "",
    result: null,
    errorMessage: null
  }),
  getters: {
    isBusy: (state): boolean => state.status === "working",
    selectedIndices: (state): number[] =>
      state.pages.filter((page) => page.selected).map((page) => page.pageIndex),
    pageCount: (state): number => state.source?.pageCount ?? 0
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
        this.rangeInput = `1-${source.pageCount}`;
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
    setRangeMode(mode: SplitRangeMode): void {
      this.rangeMode = mode;
    },
    setRangeInput(value: string): void {
      this.rangeInput = value;
    },
    sourceBytesMap(): Map<string, Uint8Array> {
      const map = new Map<string, Uint8Array>();
      if (this.source) map.set(this.source.id, new Uint8Array(this.source.bytes));
      return map;
    },
    async extract(): Promise<void> {
      if (!this.source) return;
      const selected = this.pages.filter((page) => page.selected);
      if (selected.length === 0) {
        this.fail(new Error("Select at least one page to extract."));
        return;
      }
      this.status = "working";
      this.errorMessage = null;
      try {
        const { assemble } = usePdfBuild();
        const refs = selected.map((page) => ({
          sourceId: page.sourceId,
          pageIndex: page.pageIndex,
          rotation: 0
        }));
        const bytes = await assemble(refs, this.sourceBytesMap());
        this.result = {
          bytes,
          fileName: toExtractedFileName(this.source.name),
          mimeType: "application/pdf"
        };
        this.status = "done";
      } catch (error) {
        this.fail(error);
      }
    },
    async splitToZip(): Promise<void> {
      if (!this.source) return;
      const source = this.source;
      this.status = "working";
      this.errorMessage = null;
      try {
        const groups =
          this.rangeMode === "perPage"
            ? Array.from({ length: source.pageCount }, (_, index) => ({
                label: String(index + 1),
                indices: [index]
              }))
            : parsePageRangeGroups(this.rangeInput, source.pageCount);

        const { assemble } = usePdfBuild();
        const bytesMap = this.sourceBytesMap();
        const base = pdfBaseName(source.name);
        const files: Record<string, Uint8Array> = {};
        for (const group of groups) {
          const refs = group.indices.map((pageIndex) => ({
            sourceId: source.id,
            pageIndex,
            rotation: 0
          }));
          files[`${base}-${group.label}.pdf`] = await assemble(refs, bytesMap);
        }

        const { zip } = useZip();
        const bytes = await zip(files);
        this.result = {
          bytes,
          fileName: toSplitZipName(source.name),
          mimeType: "application/zip"
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
      this.rangeMode = "ranges";
      this.rangeInput = "";
      this.result = null;
      this.errorMessage = null;
    }
  }
});
