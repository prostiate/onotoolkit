import { defineStore } from "pinia";
import { markRaw } from "vue";
import { isBoxObject, type EditorObject, type EditorPage, type EditorTool } from "~/types/editPdf";
import { pdfFileSchema } from "~/schemas/pdfFile";

export type EditPdfStatus = "idle" | "loading" | "ready" | "exporting" | "done" | "error";

/** Style defaults applied to newly-created objects. */
export interface EditorStyle {
  stroke: string;
  fill: string;
  strokeWidth: number;
  opacity: number;
}

interface Snapshot {
  pages: EditorPage[];
  objects: Record<string, EditorObject[]>;
}

interface EditPdfState {
  fileName: string;
  status: EditPdfStatus;
  errorMessage: string | null;
  sourceBytes: Uint8Array | null;
  pages: EditorPage[];
  objects: Record<string, EditorObject[]>;
  activePageId: string | null;
  selectedId: string | null;
  tool: EditorTool;
  zoom: number;
  style: EditorStyle;
  resultBytes: Uint8Array | null;
  resultName: string;
  past: Snapshot[];
  future: Snapshot[];
  /** Bumped on any change that the canvas must re-render for. */
  revision: number;
}

const HISTORY_LIMIT = 50;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, "") || "document";
}

/** Returns a copy of an object shifted by (dx, dy) points in page space. */
function offsetObject(obj: EditorObject, dx: number, dy: number): EditorObject {
  if (isBoxObject(obj)) {
    return { ...obj, cx: obj.cx + dx, cy: obj.cy + dy };
  }
  if (obj.type === "line" || obj.type === "arrow") {
    return { ...obj, x1: obj.x1 + dx, y1: obj.y1 + dy, x2: obj.x2 + dx, y2: obj.y2 + dy };
  }
  if (obj.type === "draw" || obj.type === "signature") {
    return {
      ...obj,
      points: obj.points.map((p: number, i: number) => p + (i % 2 === 0 ? dx : dy))
    };
  }
  return obj;
}

export const useEditPdfStore = defineStore("editPdf", {
  state: (): EditPdfState => ({
    fileName: "",
    status: "idle",
    errorMessage: null,
    sourceBytes: null,
    pages: [],
    objects: {},
    activePageId: null,
    selectedId: null,
    tool: "select",
    zoom: 1,
    style: { stroke: "#dc2626", fill: "transparent", strokeWidth: 2, opacity: 1 },
    resultBytes: null,
    resultName: "edited.pdf",
    past: [],
    future: [],
    revision: 0
  }),
  getters: {
    isBusy: (state): boolean => state.status === "loading" || state.status === "exporting",
    pageCount: (state): number => state.pages.length,
    activePage: (state): EditorPage | null =>
      state.pages.find((p) => p.id === state.activePageId) ?? null,
    activeObjects: (state): EditorObject[] =>
      state.activePageId ? (state.objects[state.activePageId] ?? []) : [],
    selectedObject(state): EditorObject | null {
      if (!state.activePageId || !state.selectedId) return null;
      return (
        (state.objects[state.activePageId] ?? []).find((o) => o.id === state.selectedId) ?? null
      );
    },
    canUndo: (state): boolean => state.past.length > 0,
    canRedo: (state): boolean => state.future.length > 0,
    hasEdits: (state): boolean => Object.values(state.objects).some((list) => list.length > 0)
  },
  actions: {
    pushHistory(): void {
      // Snapshots the state for undo. Does NOT bump `revision`: it runs at the
      // start of a gesture (e.g. drag), and re-rendering the canvas mid-drag
      // would destroy the node being dragged.
      this.past.push({ pages: clone(this.pages), objects: clone(this.objects) });
      if (this.past.length > HISTORY_LIMIT) this.past.shift();
      this.future = [];
    },
    undo(): void {
      const prev = this.past.pop();
      if (!prev) return;
      this.future.push({ pages: clone(this.pages), objects: clone(this.objects) });
      this.pages = prev.pages;
      this.objects = prev.objects;
      this.selectedId = null;
      this.revision += 1;
      if (!this.pages.some((p) => p.id === this.activePageId)) {
        this.activePageId = this.pages[0]?.id ?? null;
      }
    },
    redo(): void {
      const next = this.future.pop();
      if (!next) return;
      this.past.push({ pages: clone(this.pages), objects: clone(this.objects) });
      this.pages = next.pages;
      this.objects = next.objects;
      this.selectedId = null;
      this.revision += 1;
    },
    async setFile(file: File): Promise<void> {
      const parsed = pdfFileSchema.safeParse(file);
      if (!parsed.success) {
        this.errorMessage = parsed.error.issues[0]?.message ?? "Please choose a valid PDF.";
        this.status = "error";
        return;
      }
      this.status = "loading";
      this.errorMessage = null;
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { PDFDocument } = await import("pdf-lib");
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages: EditorPage[] = doc.getPages().map((page, index) => {
          const { width, height } = page.getSize();
          return {
            id: crypto.randomUUID(),
            sourceIndex: index,
            widthPts: width,
            heightPts: height,
            rotation: page.getRotation().angle % 360
          };
        });
        if (pages.length === 0) throw new Error("This PDF has no pages.");
        this.sourceBytes = markRaw(bytes);
        this.fileName = file.name;
        this.pages = pages;
        this.objects = Object.fromEntries(pages.map((p) => [p.id, []]));
        this.activePageId = pages[0]!.id;
        this.selectedId = null;
        this.past = [];
        this.future = [];
        this.resultBytes = null;
        this.resultName = `${baseName(file.name)}-edited.pdf`;
        this.status = "ready";
      } catch (error) {
        this.status = "error";
        this.errorMessage = error instanceof Error ? error.message : "Could not open this PDF.";
      }
    },
    setTool(tool: EditorTool): void {
      this.tool = tool;
      if (tool !== "select") this.selectedId = null;
    },
    setZoom(zoom: number): void {
      this.zoom = Math.max(0.4, Math.min(3, Math.round(zoom * 100) / 100));
    },
    duplicateSelected(): void {
      const obj = this.selectedObject;
      if (!obj || !this.activePageId) return;
      this.pushHistory();
      const copy = { ...offsetObject(obj, 12, 12), id: crypto.randomUUID() };
      (this.objects[this.activePageId] ??= []).push(copy);
      this.selectedId = copy.id;
      this.tool = "select";
      this.revision += 1;
    },
    nudgeSelected(dx: number, dy: number): void {
      const obj = this.selectedObject;
      if (!obj || !this.activePageId) return;
      this.pushHistory();
      const list = this.objects[this.activePageId] ?? [];
      const index = list.findIndex((o) => o.id === obj.id);
      if (index >= 0) list[index] = offsetObject(obj, dx, dy);
      this.revision += 1;
    },
    setActivePage(id: string): void {
      this.activePageId = id;
      this.selectedId = null;
    },
    select(id: string | null): void {
      this.selectedId = id;
    },
    setStyle(patch: Partial<EditorStyle>): void {
      this.style = { ...this.style, ...patch };
    },
    addObject(obj: EditorObject): void {
      if (!this.activePageId) return;
      this.pushHistory();
      (this.objects[this.activePageId] ??= []).push(obj);
      this.selectedId = obj.id;
      // Keep the current tool active (sticky) so the user can add several of the
      // same element; switch to Select to move/resize what was placed.
      this.revision += 1;
    },
    /** Live update during a drag/transform (call pushHistory() at gesture start). */
    updateObject(id: string, patch: Partial<EditorObject>): void {
      if (!this.activePageId) return;
      const list = this.objects[this.activePageId];
      const obj = list?.find((o) => o.id === id);
      if (obj) Object.assign(obj, patch);
      this.revision += 1;
    },
    removeSelected(): void {
      if (!this.activePageId || !this.selectedId) return;
      this.pushHistory();
      const list = this.objects[this.activePageId] ?? [];
      this.objects[this.activePageId] = list.filter((o) => o.id !== this.selectedId);
      this.selectedId = null;
      this.revision += 1;
    },
    reorderSelected(direction: "front" | "back"): void {
      if (!this.activePageId || !this.selectedId) return;
      const list = this.objects[this.activePageId] ?? [];
      const index = list.findIndex((o) => o.id === this.selectedId);
      if (index < 0) return;
      this.pushHistory();
      const [obj] = list.splice(index, 1);
      if (obj) {
        if (direction === "front") list.push(obj);
        else list.unshift(obj);
      }
      this.revision += 1;
    },
    addBlankPage(): void {
      this.pushHistory();
      const template = this.activePage ?? this.pages[0];
      const page: EditorPage = {
        id: crypto.randomUUID(),
        sourceIndex: null,
        widthPts: template?.widthPts ?? 595,
        heightPts: template?.heightPts ?? 842,
        rotation: 0
      };
      const at = this.pages.findIndex((p) => p.id === this.activePageId);
      this.pages.splice(at < 0 ? this.pages.length : at + 1, 0, page);
      this.objects[page.id] = [];
      this.activePageId = page.id;
    },
    deletePage(id: string): void {
      if (this.pages.length <= 1) return;
      this.pushHistory();
      const at = this.pages.findIndex((p) => p.id === id);
      this.pages = this.pages.filter((p) => p.id !== id);
      Reflect.deleteProperty(this.objects, id);
      if (this.activePageId === id) {
        this.activePageId = this.pages[Math.max(0, at - 1)]?.id ?? null;
      }
    },
    movePage(id: string, direction: -1 | 1): void {
      const index = this.pages.findIndex((p) => p.id === id);
      const to = index + direction;
      if (index < 0 || to < 0 || to >= this.pages.length) return;
      this.pushHistory();
      const [page] = this.pages.splice(index, 1);
      if (page) this.pages.splice(to, 0, page);
    },
    rotatePage(id: string): void {
      const page = this.pages.find((p) => p.id === id);
      if (!page) return;
      this.pushHistory();
      page.rotation = (page.rotation + 90) % 360;
    },
    async exportPdf(): Promise<void> {
      if (!this.sourceBytes || this.pages.length === 0) return;
      this.status = "exporting";
      this.errorMessage = null;
      try {
        const { exportEditedPdf } = useEditPdfExport();
        const bytes = await exportEditedPdf({
          sourceBytes: this.sourceBytes,
          pages: this.pages,
          objects: this.objects
        });
        this.resultBytes = markRaw(bytes);
        this.status = "done";
      } catch (error) {
        this.status = "error";
        this.errorMessage = error instanceof Error ? error.message : "Could not export the PDF.";
      }
    },
    backToEditing(): void {
      if (this.pages.length > 0) {
        this.status = "ready";
        this.resultBytes = null;
      }
    },
    reset(): void {
      this.$reset();
    }
  }
});
