<script setup lang="ts">
import type { EditorView } from "@codemirror/view";
import { redo, undo } from "@codemirror/commands";
import type { DropdownMenuItem } from "@nuxt/ui";
import type { MarkdownEdit } from "~/utils/markdownCommands";
import {
  insertCodeBlock,
  insertHorizontalRule,
  insertImage,
  insertLink,
  insertTable,
  toggleHeading,
  toggleLinePrefix,
  wrapInline
} from "~/utils/markdownCommands";

const props = defineProps<{ view: EditorView | null }>();

type Command = (doc: string, from: number, to: number) => MarkdownEdit;

/** Reads the current selection, runs a pure command, and dispatches the edit. */
function run(command: Command): void {
  const view = props.view;
  if (!view) return;
  const range = view.state.selection.main;
  const edit = command(view.state.doc.toString(), range.from, range.to);
  view.dispatch({
    changes: { from: edit.from, to: edit.to, insert: edit.insert },
    selection: { anchor: edit.anchor, head: edit.head }
  });
  view.focus();
}

function runHistory(action: (view: EditorView) => boolean): void {
  if (props.view) {
    action(props.view);
    props.view.focus();
  }
}

const headingItems: DropdownMenuItem[] = [
  { label: "Heading 1", onSelect: () => run((d, f) => toggleHeading(d, f, 1)) },
  { label: "Heading 2", onSelect: () => run((d, f) => toggleHeading(d, f, 2)) },
  { label: "Heading 3", onSelect: () => run((d, f) => toggleHeading(d, f, 3)) }
];

interface FormatButton {
  icon: string;
  label: string;
  command: Command;
}

const inlineButtons: FormatButton[] = [
  { icon: "i-lucide-bold", label: "Bold", command: (d, f, t) => wrapInline(d, f, t, "**") },
  { icon: "i-lucide-italic", label: "Italic", command: (d, f, t) => wrapInline(d, f, t, "*") },
  {
    icon: "i-lucide-strikethrough",
    label: "Strikethrough",
    command: (d, f, t) => wrapInline(d, f, t, "~~")
  },
  { icon: "i-lucide-code", label: "Inline code", command: (d, f, t) => wrapInline(d, f, t, "`") }
];

const blockButtons: FormatButton[] = [
  {
    icon: "i-lucide-quote",
    label: "Quote",
    command: (d, f, t) => toggleLinePrefix(d, f, t, "quote")
  },
  {
    icon: "i-lucide-list",
    label: "Bullet list",
    command: (d, f, t) => toggleLinePrefix(d, f, t, "bullet")
  },
  {
    icon: "i-lucide-list-ordered",
    label: "Numbered list",
    command: (d, f, t) => toggleLinePrefix(d, f, t, "ordered")
  },
  { icon: "i-lucide-square-code", label: "Code block", command: insertCodeBlock }
];

const insertButtons: FormatButton[] = [
  { icon: "i-lucide-link", label: "Link", command: insertLink },
  { icon: "i-lucide-image", label: "Image", command: insertImage },
  { icon: "i-lucide-table", label: "Table", command: insertTable },
  { icon: "i-lucide-minus", label: "Horizontal rule", command: insertHorizontalRule }
];

const disabled = computed(() => props.view === null);
</script>

<template>
  <AppCard :padded="false">
    <div class="flex flex-wrap items-center gap-1 p-2">
      <UButton
        icon="i-lucide-undo-2"
        size="sm"
        color="neutral"
        variant="ghost"
        aria-label="Undo"
        :disabled="disabled"
        @click="runHistory(undo)"
      />
      <UButton
        icon="i-lucide-redo-2"
        size="sm"
        color="neutral"
        variant="ghost"
        aria-label="Redo"
        :disabled="disabled"
        @click="runHistory(redo)"
      />

      <div class="bg-border-default mx-1 h-6 w-px" />

      <UDropdownMenu :items="headingItems">
        <UButton
          icon="i-lucide-heading"
          size="sm"
          color="neutral"
          variant="ghost"
          trailing-icon="i-lucide-chevron-down"
          aria-label="Heading"
          :disabled="disabled"
        />
      </UDropdownMenu>

      <div class="bg-border-default mx-1 h-6 w-px" />

      <UButton
        v-for="button in inlineButtons"
        :key="button.label"
        :icon="button.icon"
        size="sm"
        color="neutral"
        variant="ghost"
        :aria-label="button.label"
        :disabled="disabled"
        @click="run(button.command)"
      />

      <div class="bg-border-default mx-1 h-6 w-px" />

      <UButton
        v-for="button in blockButtons"
        :key="button.label"
        :icon="button.icon"
        size="sm"
        color="neutral"
        variant="ghost"
        :aria-label="button.label"
        :disabled="disabled"
        @click="run(button.command)"
      />

      <div class="bg-border-default mx-1 h-6 w-px" />

      <UButton
        v-for="button in insertButtons"
        :key="button.label"
        :icon="button.icon"
        size="sm"
        color="neutral"
        variant="ghost"
        :aria-label="button.label"
        :disabled="disabled"
        @click="run(button.command)"
      />
    </div>
  </AppCard>
</template>
