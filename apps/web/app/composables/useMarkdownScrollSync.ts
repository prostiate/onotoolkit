import type { EditorView } from "@codemirror/view";
import type { Ref } from "vue";

/**
 * One-way scroll sync from the CodeMirror editor to the rendered preview.
 *
 * The preview's top-level blocks carry `data-source-line` attributes (1-based,
 * matching CodeMirror line numbers - see `useMarkdownConvert`). Given a source
 * line we find the two tagged blocks that bracket it and interpolate the
 * preview's scroll position between them, so the preview tracks the editor both
 * while scrolling and while editing.
 */
export function useMarkdownScrollSync(
  view: Ref<EditorView | null>,
  preview: Ref<HTMLElement | null>
) {
  let frame = 0;

  /** Scrolls the preview so the given 1-based source line sits near the top. */
  function scrollPreviewToLine(line: number): void {
    const container = preview.value;
    if (!container) return;
    const marks = container.querySelectorAll<HTMLElement>("[data-source-line]");
    if (marks.length === 0) return;

    const containerTop = container.getBoundingClientRect().top;
    const offsetOf = (el: HTMLElement): number =>
      el.getBoundingClientRect().top - containerTop + container.scrollTop;

    let prev = marks[0];
    let next: HTMLElement | null = null;
    for (const mark of marks) {
      const markLine = Number(mark.dataset.sourceLine);
      if (markLine <= line) prev = mark;
      else {
        next = mark;
        break;
      }
    }
    if (!prev) return;

    const prevLine = Number(prev.dataset.sourceLine);
    const prevTop = offsetOf(prev);
    let target = prevTop;
    if (next) {
      const nextLine = Number(next.dataset.sourceLine);
      const fraction = (line - prevLine) / Math.max(1, nextLine - prevLine);
      target = prevTop + (offsetOf(next) - prevTop) * fraction;
    }
    container.scrollTop = target;
  }

  /** The 1-based source line currently at the top of the editor viewport. */
  function editorTopLine(editor: EditorView): number {
    const block = editor.elementAtHeight(editor.scrollDOM.scrollTop);
    return editor.state.doc.lineAt(block.from).number;
  }

  function onEditorScroll(): void {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (view.value) scrollPreviewToLine(editorTopLine(view.value));
    });
  }

  watch(
    view,
    (next, _prev, onCleanup) => {
      if (!next) return;
      const scroller = next.scrollDOM;
      scroller.addEventListener("scroll", onEditorScroll, { passive: true });
      onCleanup(() => scroller.removeEventListener("scroll", onEditorScroll));
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    if (frame) cancelAnimationFrame(frame);
  });

  return { scrollPreviewToLine };
}
