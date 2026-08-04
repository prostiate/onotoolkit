<script setup lang="ts">
import type Konva from "konva";
import type { EditorObject } from "~/types/editPdf";
import { isBoxObject } from "~/types/editPdf";
import { displayToPage, pageToDisplay } from "~/utils/pdfEditor";

/**
 * Interactive editing surface for the active page: a pdf.js backdrop with a Konva
 * overlay. Objects are stored in page-space points; this component converts to/from
 * display pixels at the current fit-to-width scale. Emits `request-text` when a
 * text box needs the TipTap popover (create or edit).
 */
const store = useEditPdfStore();
const emit = defineEmits<{ "request-text": [id: string | null, x: number, y: number] }>();

const container = ref<HTMLElement | null>(null);
const wrapper = ref<HTMLDivElement | null>(null);
const backdrop = ref<string>("");
const scale = ref(1);
const displayWidth = ref(0);
const displayHeight = ref(0);
const loading = ref(false);

const { openDocument, renderPage } = usePdfRender();
let doc: import("pdfjs-dist").PDFDocumentProxy | null = null;

let konva: typeof Konva | null = null;
let stage: Konva.Stage | null = null;
let objectLayer: Konva.Layer | null = null;
let guideLayer: Konva.Layer | null = null;
let transformer: Konva.Transformer | null = null;
const nodeById = new Map<string, Konva.Shape>();
const SNAP_THRESHOLD = 6;

// Highlight is a brush stroke (in STROKE_DRAW), not a box.
const BOX_DRAW = new Set(["rect", "ellipse", "whiteout"]);
const STROKE_DRAW = new Set(["draw", "signature", "highlight"]);

function toPts(px: number): number {
  return displayToPage(px, scale.value);
}
function toPx(pts: number): number {
  return pageToDisplay(pts, scale.value);
}

/* ------------------------------ backdrop render ------------------------------ */

async function ensureDoc(): Promise<void> {
  if (doc || !store.sourceBytes) return;
  doc = await openDocument(store.sourceBytes);
}

async function renderBackdrop(): Promise<void> {
  const page = store.activePage;
  const host = container.value;
  if (!page || !host) return;
  loading.value = true;
  try {
    const fit = Math.min(host.clientWidth || 720, 1100) / page.widthPts;
    scale.value = fit * store.zoom;
    displayWidth.value = Math.round(page.widthPts * scale.value);
    displayHeight.value = Math.round(page.heightPts * scale.value);
    backdrop.value = "";
    // Build the interactive stage first so it accepts input immediately, then
    // fill in the (slower) pdf.js backdrop image behind it.
    await nextTick();
    await rebuildStage();
    if (page.sourceIndex !== null) {
      await ensureDoc();
      if (doc) {
        const rendered = await renderPage(doc, page.sourceIndex + 1, displayWidth.value);
        backdrop.value = rendered.dataUrl;
      }
    }
  } finally {
    loading.value = false;
  }
}

/* ------------------------------- konva stage -------------------------------- */

async function ensureKonva(): Promise<void> {
  if (import.meta.server) return;
  if (!konva) konva = (await import("konva")).default;
}

async function rebuildStage(): Promise<void> {
  await ensureKonva();
  if (!konva || !wrapper.value) return;
  stage?.destroy();
  nodeById.clear();

  stage = new konva.Stage({
    container: wrapper.value,
    width: displayWidth.value,
    height: displayHeight.value
  });
  objectLayer = new konva.Layer();
  stage.add(objectLayer);
  guideLayer = new konva.Layer({ listening: false });
  stage.add(guideLayer);
  transformer = new konva.Transformer({
    rotateEnabled: true,
    ignoreStroke: true,
    borderStroke: "#0891b2",
    anchorStroke: "#0891b2"
  });
  objectLayer.add(transformer);

  for (const obj of store.activeObjects) addNode(obj);
  attachStageHandlers();
  syncSelection();
  objectLayer.draw();
}

function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

function addNode(obj: EditorObject): void {
  if (!konva || !objectLayer) return;
  let node: Konva.Shape | null = null;

  if (obj.type === "text" || obj.type === "image") {
    const image = new konva.Image({
      x: toPx(obj.cx),
      y: toPx(obj.cy),
      width: toPx(obj.width),
      height: toPx(obj.height),
      offsetX: toPx(obj.width) / 2,
      offsetY: toPx(obj.height) / 2,
      rotation: obj.rotation,
      image: undefined
    });
    void loadImageEl(obj.dataUrl).then((el) => {
      image.image(el);
      objectLayer?.draw();
    });
    node = image;
  } else if (obj.type === "nativeText") {
    const w = toPx(obj.width);
    const h = toPx(obj.height);
    node = new konva.Text({
      x: toPx(obj.cx),
      y: toPx(obj.cy),
      width: w,
      height: h,
      offsetX: w / 2,
      offsetY: h / 2,
      rotation: obj.rotation,
      text: obj.text,
      fontSize: toPx(obj.fontSize),
      fill: obj.color,
      align: obj.align,
      lineHeight: 1.25,
      fontStyle: `${obj.bold ? "bold" : ""} ${obj.italic ? "italic" : ""}`.trim() || "normal"
    });
  } else if (obj.type === "rect" || obj.type === "highlight" || obj.type === "whiteout") {
    node = new konva.Rect({
      x: toPx(obj.cx),
      y: toPx(obj.cy),
      width: toPx(obj.width),
      height: toPx(obj.height),
      offsetX: toPx(obj.width) / 2,
      offsetY: toPx(obj.height) / 2,
      rotation: obj.rotation,
      fill: obj.fill === "transparent" ? undefined : obj.fill,
      opacity: obj.opacity,
      stroke: obj.strokeWidth > 0 ? obj.stroke : undefined,
      strokeWidth: obj.strokeWidth * scale.value
    });
  } else if (obj.type === "ellipse") {
    node = new konva.Ellipse({
      x: toPx(obj.cx),
      y: toPx(obj.cy),
      radiusX: toPx(obj.width) / 2,
      radiusY: toPx(obj.height) / 2,
      rotation: obj.rotation,
      fill: obj.fill === "transparent" ? undefined : obj.fill,
      opacity: obj.opacity,
      stroke: obj.strokeWidth > 0 ? obj.stroke : undefined,
      strokeWidth: obj.strokeWidth * scale.value
    });
  } else if (obj.type === "line" || obj.type === "arrow") {
    const points = [toPx(obj.x1), toPx(obj.y1), toPx(obj.x2), toPx(obj.y2)];
    node =
      obj.type === "arrow"
        ? new konva.Arrow({
            points,
            stroke: obj.stroke,
            fill: obj.stroke,
            strokeWidth: obj.strokeWidth * scale.value,
            hitStrokeWidth: 16,
            pointerLength: 10,
            pointerWidth: 10
          })
        : new konva.Line({
            points,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth * scale.value,
            hitStrokeWidth: 16
          });
  } else if (obj.type === "draw" || obj.type === "signature") {
    node = new konva.Line({
      points: obj.points.map(toPx),
      stroke: obj.stroke,
      strokeWidth: obj.strokeWidth * scale.value,
      hitStrokeWidth: 16,
      opacity: obj.opacity,
      lineCap: "round",
      lineJoin: "round",
      tension: 0.3
    });
  }

  if (!node) return;
  node.id(obj.id);
  const draggable = store.tool === "select";
  node.draggable(draggable);
  bindNodeEvents(node, obj);
  objectLayer.add(node);
  nodeById.set(obj.id, node);
}

function bindNodeEvents(node: Konva.Shape, obj: EditorObject): void {
  node.on("pointerdown", (e) => {
    if (store.tool !== "select") return;
    e.cancelBubble = true;
    store.select(obj.id);
  });
  node.on("dragstart transformstart", () => store.pushHistory());
  node.on("dragmove", () => applySnapping(node));
  node.on("dragend transformend", () => {
    clearGuides();
    commitNode(node, obj.id);
  });
  if (obj.type === "text" || obj.type === "nativeText") {
    node.on("dblclick dbltap", () => {
      emit("request-text", obj.id, 0, 0);
    });
  }
}

/** Reads a node's geometry back into the store after a drag/transform. */
function commitNode(node: Konva.Shape, id: string): void {
  const obj = store.activeObjects.find((o) => o.id === id);
  if (!obj) return;
  if (obj.type === "ellipse") {
    const rx = (node as Konva.Ellipse).radiusX() * node.scaleX();
    const ry = (node as Konva.Ellipse).radiusY() * node.scaleY();
    node.scale({ x: 1, y: 1 });
    store.updateObject(id, {
      cx: toPts(node.x()),
      cy: toPts(node.y()),
      width: toPts(rx * 2),
      height: toPts(ry * 2),
      rotation: node.rotation()
    } as Partial<EditorObject>);
  } else if (isBoxObject(obj)) {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const width = Math.max(4, node.width() * scaleX || toPx(obj.width));
    const height = Math.max(4, node.height() * scaleY || toPx(obj.height));
    node.scale({ x: 1, y: 1 });
    node.width(width);
    node.height(height);
    node.offsetX(width / 2);
    node.offsetY(height / 2);
    store.updateObject(id, {
      cx: toPts(node.x()),
      cy: toPts(node.y()),
      width: toPts(width),
      height: toPts(height),
      rotation: node.rotation()
    } as Partial<EditorObject>);
  } else if (obj.type === "line" || obj.type === "arrow") {
    const dx = node.x();
    const dy = node.y();
    node.position({ x: 0, y: 0 });
    store.updateObject(id, {
      x1: toPts(toPx(obj.x1) + dx),
      y1: toPts(toPx(obj.y1) + dy),
      x2: toPts(toPx(obj.x2) + dx),
      y2: toPts(toPx(obj.y2) + dy)
    } as Partial<EditorObject>);
  } else if (obj.type === "draw" || obj.type === "signature") {
    const dx = node.x();
    const dy = node.y();
    node.position({ x: 0, y: 0 });
    store.updateObject(id, {
      points: obj.points.map((p: number, i: number) => toPts(toPx(p) + (i % 2 === 0 ? dx : dy)))
    } as Partial<EditorObject>);
  }
  objectLayer?.draw();
}

function syncSelection(): void {
  if (!transformer || !objectLayer) return;
  const node = store.selectedId ? nodeById.get(store.selectedId) : null;
  const selectable = node && store.tool === "select" && isTransformable(store.selectedId);
  transformer.nodes(selectable ? [node] : []);
  objectLayer.draw();
}

function isTransformable(id: string | null): boolean {
  const obj = store.activeObjects.find((o) => o.id === id);
  return !!obj && isBoxObject(obj);
}

function clearGuides(): void {
  guideLayer?.destroyChildren();
  guideLayer?.batchDraw();
}

/** Snaps a dragged node's centre to the page centre/edges and other centres. */
function applySnapping(node: Konva.Shape): void {
  if (!konva || !guideLayer) return;
  clearGuides();
  const vTargets = [0, displayWidth.value / 2, displayWidth.value];
  const hTargets = [0, displayHeight.value / 2, displayHeight.value];
  nodeById.forEach((other) => {
    if (other === node) return;
    vTargets.push(other.x());
    hTargets.push(other.y());
  });

  let snappedX: number | null = null;
  for (const t of vTargets) {
    if (Math.abs(node.x() - t) <= SNAP_THRESHOLD) {
      node.x(t);
      snappedX = t;
      break;
    }
  }
  let snappedY: number | null = null;
  for (const t of hTargets) {
    if (Math.abs(node.y() - t) <= SNAP_THRESHOLD) {
      node.y(t);
      snappedY = t;
      break;
    }
  }
  if (snappedX !== null) {
    guideLayer.add(
      new konva.Line({
        points: [snappedX, 0, snappedX, displayHeight.value],
        stroke: "#0891b2",
        strokeWidth: 1,
        dash: [4, 4]
      })
    );
  }
  if (snappedY !== null) {
    guideLayer.add(
      new konva.Line({
        points: [0, snappedY, displayWidth.value, snappedY],
        stroke: "#0891b2",
        strokeWidth: 1,
        dash: [4, 4]
      })
    );
  }
  guideLayer.batchDraw();
}

/* ----------------------------- create-by-drag ------------------------------- */

let drawState: {
  startX: number;
  startY: number;
  node: Konva.Shape | null;
  points: number[];
} | null = null;

/** Pointer position relative to the stage, falling back to the raw event. */
function eventPos(e: Konva.KonvaEventObject<PointerEvent>): { x: number; y: number } | null {
  const konvaPos = stage?.getPointerPosition();
  if (konvaPos) return konvaPos;
  if (!stage) return null;
  const rect = stage.container().getBoundingClientRect();
  return { x: e.evt.clientX - rect.left, y: e.evt.clientY - rect.top };
}

// Bind Konva pointer events (unifies mouse, touch, and pen) rather than the
// mouse-only events, so drawing works across devices and is driven by real
// PointerEvents.
function attachStageHandlers(): void {
  if (!stage) return;
  stage.on("pointerdown", (e) => {
    if (e.target === stage) store.select(null);
    if (store.tool === "select") return;
    e.evt.preventDefault();
    const pos = eventPos(e);
    if (!pos) return;
    if (store.tool === "text") {
      emit("request-text", null, toPts(pos.x), toPts(pos.y));
      return;
    }
    if (store.tool === "image") {
      pickImageAt(toPts(pos.x), toPts(pos.y));
      return;
    }
    beginDraw(pos.x, pos.y);
  });
  stage.on("pointermove", (e) => {
    if (!drawState) return;
    const pos = eventPos(e);
    if (pos) extendDraw(pos.x, pos.y);
  });
  stage.on("pointerup", finishDraw);
}

function beginDraw(x: number, y: number): void {
  if (!konva || !objectLayer) return;
  drawState = { startX: x, startY: y, node: null, points: [x, y] };
  const s = store.style;
  if (BOX_DRAW.has(store.tool)) {
    const isEllipse = store.tool === "ellipse";
    drawState.node = isEllipse
      ? new konva.Ellipse({ x, y, radiusX: 0, radiusY: 0 })
      : new konva.Rect({ x, y, width: 0, height: 0 });
    const fill =
      store.tool === "whiteout" ? "#ffffff" : store.tool === "highlight" ? s.stroke : s.fill;
    const opacity = store.tool === "highlight" ? 0.4 : store.tool === "whiteout" ? 1 : s.opacity;
    drawState.node.setAttrs({
      fill: fill === "transparent" ? undefined : fill,
      opacity,
      stroke: store.tool === "rect" || store.tool === "ellipse" ? s.stroke : undefined,
      strokeWidth: s.strokeWidth * scale.value
    });
  } else if (STROKE_DRAW.has(store.tool)) {
    drawState.node = new konva.Line({
      points: [x, y],
      stroke: store.tool === "highlight" ? s.stroke : s.stroke,
      strokeWidth: (store.tool === "highlight" ? 14 : s.strokeWidth) * scale.value,
      opacity: store.tool === "highlight" ? 0.4 : 1,
      lineCap: "round",
      lineJoin: "round",
      tension: store.tool === "signature" ? 0.4 : 0.3
    });
  } else if (store.tool === "line" || store.tool === "arrow") {
    drawState.node =
      store.tool === "arrow"
        ? new konva.Arrow({
            points: [x, y, x, y],
            stroke: s.stroke,
            fill: s.stroke,
            strokeWidth: s.strokeWidth * scale.value
          })
        : new konva.Line({
            points: [x, y, x, y],
            stroke: s.stroke,
            strokeWidth: s.strokeWidth * scale.value
          });
  }
  if (drawState.node) objectLayer.add(drawState.node);
}

function extendDraw(x: number, y: number): void {
  if (!drawState?.node) return;
  const { startX, startY } = drawState;
  const node = drawState.node;
  if (node.getClassName() === "Rect") {
    (node as Konva.Rect).setAttrs({
      x: Math.min(startX, x),
      y: Math.min(startY, y),
      width: Math.abs(x - startX),
      height: Math.abs(y - startY)
    });
  } else if (node.getClassName() === "Ellipse") {
    (node as Konva.Ellipse).setAttrs({
      x: (startX + x) / 2,
      y: (startY + y) / 2,
      radiusX: Math.abs(x - startX) / 2,
      radiusY: Math.abs(y - startY) / 2
    });
  } else if (node.getClassName() === "Arrow" || node.getClassName() === "Line") {
    if (STROKE_DRAW.has(store.tool)) {
      drawState.points.push(x, y);
      (node as Konva.Line).points(drawState.points);
    } else {
      (node as Konva.Line).points([startX, startY, x, y]);
    }
  }
  objectLayer?.draw();
}

function finishDraw(): void {
  if (!drawState?.node) {
    drawState = null;
    return;
  }
  const node = drawState.node;
  const tool = store.tool;
  const s = store.style;
  node.destroy();
  drawState = null;

  if (BOX_DRAW.has(tool)) {
    const b = node as Konva.Rect | Konva.Ellipse;
    const isEllipse = tool === "ellipse";
    const w = isEllipse ? (b as Konva.Ellipse).radiusX() * 2 : (b as Konva.Rect).width();
    const h = isEllipse ? (b as Konva.Ellipse).radiusY() * 2 : (b as Konva.Rect).height();
    if (w < 4 || h < 4) return;
    const cx = isEllipse ? b.x() : b.x() + w / 2;
    const cy = isEllipse ? b.y() : b.y() + h / 2;
    store.addObject({
      id: crypto.randomUUID(),
      type: tool as "rect" | "ellipse" | "highlight" | "whiteout",
      cx: toPts(cx),
      cy: toPts(cy),
      width: toPts(w),
      height: toPts(h),
      rotation: 0,
      stroke: s.stroke,
      fill: tool === "whiteout" ? "#ffffff" : tool === "highlight" ? s.stroke : s.fill,
      strokeWidth: tool === "rect" || tool === "ellipse" ? s.strokeWidth : 0,
      opacity: tool === "highlight" ? 0.4 : tool === "whiteout" ? 1 : s.opacity
    });
  } else if (tool === "line" || tool === "arrow") {
    const pts = (node as Konva.Line).points();
    if (Math.hypot(pts[2]! - pts[0]!, pts[3]! - pts[1]!) < 4) return;
    store.addObject({
      id: crypto.randomUUID(),
      type: tool,
      x1: toPts(pts[0]!),
      y1: toPts(pts[1]!),
      x2: toPts(pts[2]!),
      y2: toPts(pts[3]!),
      stroke: s.stroke,
      strokeWidth: s.strokeWidth
    });
  } else if (STROKE_DRAW.has(tool)) {
    const pts = (node as Konva.Line).points();
    if (pts.length < 4) return;
    store.addObject({
      id: crypto.randomUUID(),
      type: tool === "highlight" ? "draw" : (tool as "draw" | "signature"),
      points: pts.map(toPts),
      stroke: s.stroke,
      strokeWidth: tool === "highlight" ? 14 : s.strokeWidth,
      opacity: tool === "highlight" ? 0.4 : 1
    });
  }
}

async function pickImageAt(cxPts: number, cyPts: number): Promise<void> {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const { blobToRgba, rgbaToBlob } = useCanvasImage();
    const rgba = await blobToRgba(file);
    const pngBlob = await rgbaToBlob(rgba, "image/png");
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(pngBlob);
    });
    const maxW = store.activePage ? store.activePage.widthPts * 0.4 : 200;
    const wPts = Math.min(maxW, rgba.width);
    const hPts = (rgba.height / rgba.width) * wPts;
    store.addObject({
      id: crypto.randomUUID(),
      type: "image",
      cx: cxPts,
      cy: cyPts,
      width: wPts,
      height: hPts,
      rotation: 0,
      dataUrl
    });
  };
  input.click();
}

/* -------------------------------- watchers ---------------------------------- */

watch(
  () => store.activePageId,
  () => void renderBackdrop()
);
watch(
  () => store.zoom,
  () => void renderBackdrop()
);
watch(
  () => store.revision,
  () => void rebuildStage()
);
watch(
  () => store.tool,
  () => {
    nodeById.forEach((n) => n.draggable(store.tool === "select"));
    syncSelection();
  }
);
watch(() => store.selectedId, syncSelection);

let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
  void renderBackdrop();
  if (container.value) {
    resizeObserver = new ResizeObserver(() => void renderBackdrop());
    resizeObserver.observe(container.value);
  }
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  stage?.destroy();
  void (doc as { destroy?: () => Promise<void> } | null)?.destroy?.();
});

defineExpose({ refresh: rebuildStage });
</script>

<template>
  <div ref="container" class="w-full">
    <div class="text-dimmed mb-2 flex items-center gap-2 text-xs" aria-live="polite">
      <UIcon v-if="loading" name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
      <span v-if="store.tool !== 'select'">Draw on the page to add {{ store.tool }}.</span>
      <span v-else>Select, drag, resize, or rotate an item. Double-click text to edit.</span>
    </div>
    <div class="mx-auto w-fit max-w-full overflow-auto">
      <div
        class="relative shadow-lg"
        data-testid="edit-canvas"
        :style="{ width: `${displayWidth}px`, height: `${displayHeight}px` }"
      >
        <div class="absolute inset-0 bg-white">
          <img v-if="backdrop" :src="backdrop" alt="PDF page" class="block h-full w-full" />
        </div>
        <div ref="wrapper" class="absolute inset-0" />
      </div>
    </div>
  </div>
</template>
