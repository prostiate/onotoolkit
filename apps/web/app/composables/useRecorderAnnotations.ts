import { computed, ref, shallowRef } from "vue";
import type { AnnotationStroke, AnnotationTool } from "~/types/screenRecorder";

/** Preset ink colors offered in the annotation toolbar. */
export const ANNOTATION_COLORS = [
  "#f43f5e",
  "#f59e0b",
  "#22c55e",
  "#0891b2",
  "#6366f1",
  "#ffffff",
  "#0f172a"
] as const;

/** Stroke width presets, expressed as a fraction of the canvas width. */
export const ANNOTATION_WIDTHS = { thin: 0.003, medium: 0.006, thick: 0.011 } as const;
export type AnnotationWidthKey = keyof typeof ANNOTATION_WIDTHS;

// Module-level singleton state: the engine polls `strokes` each frame while the
// toolbar and stage mutate it, so they must share one instance.
const strokes = shallowRef<AnnotationStroke[]>([]);
const tool = ref<AnnotationTool>("pen");
const color = ref<string>(ANNOTATION_COLORS[0]);
const widthKey = ref<AnnotationWidthKey>("medium");
const active = ref(false);
let current: AnnotationStroke | null = null;
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `stroke-${idCounter}`;
}

export function useRecorderAnnotations() {
  function setTool(next: AnnotationTool): void {
    tool.value = next;
  }

  function startStroke(x: number, y: number): void {
    if (!active.value) return;
    current = {
      id: nextId(),
      tool: tool.value,
      color: color.value,
      width: ANNOTATION_WIDTHS[widthKey.value],
      points: [{ x, y }]
    };
    strokes.value = [...strokes.value, current];
  }

  function extendStroke(x: number, y: number): void {
    if (!current) return;
    if (current.tool === "pen" || current.tool === "highlighter") {
      current.points.push({ x, y });
    } else {
      // rect/arrow only track start + end
      current.points = [current.points[0] ?? { x, y }, { x, y }];
    }
    // Reassign to trigger shallowRef consumers (engine reads .value each frame).
    strokes.value = [...strokes.value];
  }

  function endStroke(): void {
    if (current && current.points.length < 2 && current.tool !== "pen") {
      // A click without a drag on rect/arrow produces nothing.
      strokes.value = strokes.value.filter((s) => s.id !== current!.id);
    }
    current = null;
  }

  function undo(): void {
    strokes.value = strokes.value.slice(0, -1);
  }

  function clear(): void {
    strokes.value = [];
    current = null;
  }

  return {
    strokes,
    tool,
    color,
    widthKey,
    active,
    hasStrokes: computed(() => strokes.value.length > 0),
    setTool,
    setColor: (next: string) => (color.value = next),
    setWidth: (next: AnnotationWidthKey) => (widthKey.value = next),
    setActive: (next: boolean) => (active.value = next),
    startStroke,
    extendStroke,
    endStroke,
    undo,
    clear,
    /** Plain snapshot for the engine's per-frame draw. */
    snapshot: (): AnnotationStroke[] => strokes.value
  };
}
