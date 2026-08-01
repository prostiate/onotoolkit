<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    accept?: string;
    disabled?: boolean;
    hint?: string;
    /** Allow selecting several files at once; emits `select-files` instead of `select`. */
    multiple?: boolean;
    label?: string;
  }>(),
  {
    accept: "application/pdf,.pdf",
    disabled: false,
    hint: "PDF up to 500 MB",
    multiple: false,
    label: ""
  }
);

const emit = defineEmits<{ select: [file: File]; "select-files": [files: File[]] }>();

const isDragging = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

const promptLabel = computed(
  () =>
    props.label ||
    (props.multiple
      ? "Drop your PDFs here, or tap to browse"
      : "Drop your PDF here, or tap to browse")
);

function openPicker(): void {
  if (props.disabled) return;
  inputRef.value?.click();
}

function emitFiles(files: FileList | null): void {
  if (!files || files.length === 0) return;
  if (props.multiple) {
    emit("select-files", Array.from(files));
    return;
  }
  const file = files.item(0);
  if (file) emit("select", file);
}

function onInputChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  emitFiles(target.files);
  target.value = "";
}

function onDrop(event: DragEvent): void {
  isDragging.value = false;
  if (props.disabled) return;
  emitFiles(event.dataTransfer?.files ?? null);
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
    <span class="text-highlighted text-base font-semibold">{{ promptLabel }}</span>
    <span class="text-dimmed text-xs">{{ hint }}</span>
    <input
      ref="inputRef"
      type="file"
      class="hidden"
      :accept="accept"
      :multiple="multiple"
      @change="onInputChange"
    />
  </button>
</template>
