<script setup lang="ts">
import type { EditorTool } from "~/types/editPdf";

const store = useEditPdfStore();

const tools: { value: EditorTool; icon: string; label: string }[] = [
  { value: "select", icon: "i-lucide-mouse-pointer-2", label: "Select" },
  { value: "text", icon: "i-lucide-type", label: "Text" },
  { value: "image", icon: "i-lucide-image", label: "Image" },
  { value: "draw", icon: "i-lucide-pencil", label: "Draw" },
  { value: "highlight", icon: "i-lucide-highlighter", label: "Highlight" },
  { value: "rect", icon: "i-lucide-square", label: "Rectangle" },
  { value: "ellipse", icon: "i-lucide-circle", label: "Ellipse" },
  { value: "line", icon: "i-lucide-minus", label: "Line" },
  { value: "arrow", icon: "i-lucide-move-up-right", label: "Arrow" },
  { value: "whiteout", icon: "i-lucide-eraser", label: "Whiteout" },
  { value: "signature", icon: "i-lucide-signature", label: "Signature" }
];
</script>

<template>
  <div class="border-default bg-default flex flex-wrap items-center gap-1 rounded-lg border p-1.5">
    <div class="flex flex-wrap items-center gap-1" role="group" aria-label="Editing tools">
      <UButton
        v-for="t in tools"
        :key="t.value"
        :icon="t.icon"
        :color="store.tool === t.value ? 'primary' : 'neutral'"
        :variant="store.tool === t.value ? 'solid' : 'ghost'"
        :aria-pressed="store.tool === t.value"
        :aria-label="t.label"
        size="sm"
        square
        @click="store.setTool(t.value)"
      />
    </div>

    <div class="bg-default mx-1 h-6 w-px" />

    <UButton
      icon="i-lucide-undo-2"
      color="neutral"
      variant="ghost"
      size="sm"
      square
      aria-label="Undo"
      :disabled="!store.canUndo"
      @click="store.undo()"
    />
    <UButton
      icon="i-lucide-redo-2"
      color="neutral"
      variant="ghost"
      size="sm"
      square
      aria-label="Redo"
      :disabled="!store.canRedo"
      @click="store.redo()"
    />
    <UButton
      icon="i-lucide-copy"
      color="neutral"
      variant="ghost"
      size="sm"
      square
      aria-label="Duplicate selected"
      :disabled="!store.selectedId"
      @click="store.duplicateSelected()"
    />
    <UButton
      icon="i-lucide-trash-2"
      color="error"
      variant="ghost"
      size="sm"
      square
      aria-label="Delete selected"
      :disabled="!store.selectedId"
      @click="store.removeSelected()"
    />

    <div class="bg-default mx-1 h-6 w-px" />

    <UButton
      icon="i-lucide-zoom-out"
      color="neutral"
      variant="ghost"
      size="sm"
      square
      aria-label="Zoom out"
      @click="store.setZoom(store.zoom - 0.1)"
    />
    <button
      type="button"
      class="text-muted w-12 text-center text-xs tabular-nums"
      aria-label="Reset zoom"
      @click="store.setZoom(1)"
    >
      {{ Math.round(store.zoom * 100) }}%
    </button>
    <UButton
      icon="i-lucide-zoom-in"
      color="neutral"
      variant="ghost"
      size="sm"
      square
      aria-label="Zoom in"
      @click="store.setZoom(store.zoom + 0.1)"
    />
  </div>
</template>
