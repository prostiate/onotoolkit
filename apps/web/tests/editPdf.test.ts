import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { PDFDocument } from "pdf-lib";
import { useEditPdfExport } from "~/composables/useEditPdfExport";
import { useEditPdfStore } from "~/stores/editPdf";
import type { EditorObject, EditorPage } from "~/types/editPdf";

async function makeSourcePdf(pages = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage([300, 400]);
  return doc.save();
}

describe("useEditPdfExport", () => {
  it("composites shapes and native text, preserving page size/count", async () => {
    const source = await makeSourcePdf();
    const page: EditorPage = {
      id: "p1",
      sourceIndex: 0,
      widthPts: 300,
      heightPts: 400,
      rotation: 0
    };
    const objects: Record<string, EditorObject[]> = {
      p1: [
        {
          id: "r",
          type: "rect",
          cx: 150,
          cy: 200,
          width: 100,
          height: 60,
          rotation: 0,
          stroke: "#dc2626",
          fill: "#ffff00",
          strokeWidth: 2,
          opacity: 1
        },
        {
          id: "t",
          type: "nativeText",
          cx: 150,
          cy: 100,
          width: 200,
          height: 40,
          rotation: 0,
          text: "Hello selectable world that wraps onto multiple lines nicely",
          fontSize: 14,
          color: "#000000",
          align: "left",
          bold: false,
          italic: false
        }
      ]
    };

    const { exportEditedPdf } = useEditPdfExport();
    const bytes = await exportEditedPdf({ sourceBytes: source, pages: [page], objects });

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(1);
    expect(Math.round(out.getPage(0).getSize().width)).toBe(300);
    expect(bytes.length).toBeGreaterThan(source.length);
  });

  it("supports blank pages and reordering", async () => {
    const source = await makeSourcePdf(1);
    const pages: EditorPage[] = [
      { id: "blank", sourceIndex: null, widthPts: 300, heightPts: 400, rotation: 0 },
      { id: "p1", sourceIndex: 0, widthPts: 300, heightPts: 400, rotation: 90 }
    ];
    const { exportEditedPdf } = useEditPdfExport();
    const bytes = await exportEditedPdf({
      sourceBytes: source,
      pages,
      objects: { blank: [], p1: [] }
    });
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(2);
    expect(out.getPage(1).getRotation().angle).toBe(90);
  });
});

describe("editPdf store: duplicate + nudge", () => {
  beforeEach(() => setActivePinia(createPinia()));

  function seedRect() {
    const store = useEditPdfStore();
    store.pages = [{ id: "p1", sourceIndex: 0, widthPts: 300, heightPts: 400, rotation: 0 }];
    store.activePageId = "p1";
    const rect: EditorObject = {
      id: "r1",
      type: "rect",
      cx: 100,
      cy: 100,
      width: 40,
      height: 40,
      rotation: 0,
      stroke: "#000",
      fill: "transparent",
      strokeWidth: 2,
      opacity: 1
    };
    store.objects = { p1: [rect] };
    store.selectedId = "r1";
    return store;
  }

  it("duplicates the selected object with an offset and selects the copy", () => {
    const store = seedRect();
    store.duplicateSelected();
    const list = store.objects.p1!;
    expect(list).toHaveLength(2);
    const copy = list[1]!;
    expect(copy.id).not.toBe("r1");
    expect(store.selectedId).toBe(copy.id);
    if (copy.type === "rect") {
      expect(copy.cx).toBe(112);
      expect(copy.cy).toBe(112);
    }
  });

  it("does not re-render (bump revision) on a history snapshot, but does on mutations", () => {
    // Regression: pushHistory() runs at drag-start; bumping revision there would
    // rebuild the canvas mid-drag and drop the drag.
    const store = seedRect();
    const before = store.revision;
    store.pushHistory();
    expect(store.revision).toBe(before);
    store.nudgeSelected(1, 0);
    expect(store.revision).toBeGreaterThan(before);
  });

  it("keeps the current tool sticky after placing an object", () => {
    const store = seedRect();
    store.tool = "rect";
    store.addObject({
      id: "r2",
      type: "rect",
      cx: 10,
      cy: 10,
      width: 5,
      height: 5,
      rotation: 0,
      stroke: "#000",
      fill: "transparent",
      strokeWidth: 1,
      opacity: 1
    });
    expect(store.tool).toBe("rect");
  });

  it("nudges the selected object and is undoable", () => {
    const store = seedRect();
    store.nudgeSelected(5, -3);
    const obj = store.objects.p1![0]!;
    if (obj.type === "rect") {
      expect(obj.cx).toBe(105);
      expect(obj.cy).toBe(97);
    }
    expect(store.canUndo).toBe(true);
    store.undo();
    const reverted = store.objects.p1![0]!;
    if (reverted.type === "rect") {
      expect(reverted.cx).toBe(100);
      expect(reverted.cy).toBe(100);
    }
  });
});
