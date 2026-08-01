<script setup lang="ts">
import { Codemirror } from "vue-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import type { Extension } from "@codemirror/state";

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{
  "update:modelValue": [value: string];
  ready: [view: EditorView];
  "cursor-line": [line: number];
}>();

const colorMode = useColorMode();

const baseTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px" },
  ".cm-scroller": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
    lineHeight: "1.7"
  },
  ".cm-content": { padding: "12px 0" },
  ".cm-gutters": { border: "none", backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" }
});

const cursorWatcher = EditorView.updateListener.of((update) => {
  if (update.selectionSet || update.docChanged) {
    const head = update.state.selection.main.head;
    emit("cursor-line", update.state.doc.lineAt(head).number);
  }
});

const extensions = computed<Extension[]>(() => {
  const base: Extension[] = [
    markdown(),
    lineNumbers(),
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    EditorView.lineWrapping,
    cursorWatcher,
    baseTheme
  ];
  if (colorMode.value === "dark") base.push(oneDark);
  return base;
});

const value = computed<string>({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v)
});

function onReady(payload: { view: EditorView }): void {
  emit("ready", payload.view);
}
</script>

<template>
  <div class="border-default bg-default h-full overflow-hidden rounded-lg border">
    <ClientOnly>
      <Codemirror
        v-model="value"
        :extensions="extensions"
        :indent-with-tab="true"
        :tab-size="2"
        aria-label="Markdown source editor"
        placeholder="Write Markdown here..."
        class="h-full"
        @ready="onReady"
      />
      <template #fallback>
        <pre
          class="text-muted h-full overflow-auto p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap"
          >{{ modelValue }}</pre>
      </template>
    </ClientOnly>
  </div>
</template>
