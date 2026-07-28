<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    accept?: string;
    disabled?: boolean;
    hint?: string;
  }>(),
  {
    accept: "application/pdf,.pdf",
    disabled: false,
    hint: "PDF up to 500 MB"
  }
);

const emit = defineEmits<{ select: [file: File] }>();

const isDragging = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

function openPicker(): void {
  if (props.disabled) return;
  inputRef.value?.click();
}

function emitFirst(files: FileList | null): void {
  const file = files?.item(0);
  if (file) emit("select", file);
}

function onInputChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  emitFirst(target.files);
  target.value = "";
}

function onDrop(event: DragEvent): void {
  isDragging.value = false;
  if (props.disabled) return;
  emitFirst(event.dataTransfer?.files ?? null);
}

function onDragOver(): void {
  if (!props.disabled) isDragging.value = true;
}
</script>

<template>
  <button
    type="button"
    class="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors"
    :class="[
      isDragging ? 'border-primary bg-primary/5' : 'border-default bg-muted/40',
      disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-primary/60 cursor-pointer'
    ]"
    :disabled="disabled"
    :aria-label="'Choose a file. ' + hint"
    @click="openPicker"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <span
      class="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-full"
    >
      <UIcon name="i-lucide-upload-cloud" class="size-7" />
    </span>
    <span class="text-highlighted text-base font-semibold">
      Drop your PDF here, or tap to browse
    </span>
    <span class="text-dimmed text-xs">{{ hint }}</span>
    <input ref="inputRef" type="file" class="hidden" :accept="accept" @change="onInputChange" />
  </button>
</template>
