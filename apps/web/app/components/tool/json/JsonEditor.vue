<script setup lang="ts">
import { Codemirror } from "vue-codemirror";
import { json as jsonLang, jsonParseLinter } from "@codemirror/lang-json";
import { lintGutter, linter } from "@codemirror/lint";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    readonly?: boolean;
    lint?: boolean;
    ariaLabel?: string;
  }>(),
  { readonly: false, lint: false, ariaLabel: "Code editor" }
);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const colorMode = useColorMode();

const baseTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px" },
  ".cm-scroller": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
    lineHeight: "1.6"
  },
  ".cm-content": { padding: "12px 0" },
  ".cm-gutters": { border: "none", backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" }
});

const extensions = computed<Extension[]>(() => {
  const base: Extension[] = [jsonLang(), baseTheme, EditorView.lineWrapping];
  if (props.lint) base.push(linter(jsonParseLinter()), lintGutter());
  if (colorMode.value === "dark") base.push(oneDark);
  return base;
});

const value = computed<string>({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v)
});
</script>

<template>
  <div class="border-default bg-default h-full overflow-hidden rounded-lg border">
    <ClientOnly>
      <Codemirror
        v-model="value"
        :extensions="extensions"
        :disabled="readonly"
        :indent-with-tab="true"
        :tab-size="2"
        :aria-label="ariaLabel"
        placeholder=""
        class="h-full"
      />
      <template #fallback>
        <pre
          class="text-muted h-full overflow-auto p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap"
          >{{ modelValue }}</pre>
      </template>
    </ClientOnly>
  </div>
</template>
