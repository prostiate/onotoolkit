import { beforeEach, describe, expect, it } from "vitest";
import { useRecorderAnnotations } from "~/composables/useRecorderAnnotations";

/**
 * The annotations composable is a module-level singleton, so each test resets
 * it first via clear() + setActive(true).
 */
describe("useRecorderAnnotations", () => {
  beforeEach(() => {
    const a = useRecorderAnnotations();
    a.clear();
    a.setActive(true);
    a.setTool("pen");
  });

  it("ignores strokes while inactive", () => {
    const a = useRecorderAnnotations();
    a.setActive(false);
    a.startStroke(0.1, 0.1);
    a.extendStroke(0.2, 0.2);
    a.endStroke();
    expect(a.strokes.value).toHaveLength(0);
  });

  it("records a pen stroke with every sampled point", () => {
    const a = useRecorderAnnotations();
    a.startStroke(0.1, 0.1);
    a.extendStroke(0.2, 0.2);
    a.extendStroke(0.3, 0.25);
    a.endStroke();
    expect(a.strokes.value).toHaveLength(1);
    expect(a.strokes.value[0]?.points).toHaveLength(3);
    expect(a.strokes.value[0]?.tool).toBe("pen");
  });

  it("keeps only start + end for rect/arrow tools", () => {
    const a = useRecorderAnnotations();
    a.setTool("arrow");
    a.startStroke(0.1, 0.1);
    a.extendStroke(0.4, 0.4);
    a.extendStroke(0.6, 0.5);
    a.endStroke();
    expect(a.strokes.value[0]?.points).toHaveLength(2);
    expect(a.strokes.value[0]?.points[1]).toEqual({ x: 0.6, y: 0.5 });
  });

  it("drops a rect/arrow that never dragged", () => {
    const a = useRecorderAnnotations();
    a.setTool("rect");
    a.startStroke(0.1, 0.1);
    a.endStroke();
    expect(a.strokes.value).toHaveLength(0);
  });

  it("undoes the last stroke and clears all", () => {
    const a = useRecorderAnnotations();
    a.startStroke(0.1, 0.1);
    a.extendStroke(0.2, 0.2);
    a.endStroke();
    a.startStroke(0.3, 0.3);
    a.extendStroke(0.4, 0.4);
    a.endStroke();
    expect(a.strokes.value).toHaveLength(2);
    a.undo();
    expect(a.strokes.value).toHaveLength(1);
    a.clear();
    expect(a.strokes.value).toHaveLength(0);
    expect(a.hasStrokes.value).toBe(false);
  });
});
