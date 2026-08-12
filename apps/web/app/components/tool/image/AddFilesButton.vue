<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    accept?: string;
    disabled?: boolean;
    /** Allow selecting several files at once; emits `select-files` instead of `select`. */
    multiple?: boolean;
    label?: string;
  }>(),
  {
    accept: "",
    disabled: false,
    multiple: true,
    label: "Add more files"
  }
);

const emit = defineEmits<{ "select-files": [files: File[]] }>();

const inputRef = ref<HTMLInputElement | null>(null);

function openPicker(): void {
  if (props.disabled) return;
  inputRef.value?.click();
}

function onInputChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (props.multiple) {
    if (target.files && target.files.length > 0) {
      emit("select-files", Array.from(target.files));
    }
  } else {
    const file = target.files?.item(0);
    if (file) emit("select-files", [file]);
  }
  // Reset so picking the same file again still fires "change".
  target.value = "";
}
</script>

<template>
  <UButton
    type="button"
    icon="i-lucide-plus"
    size="xs"
    color="neutral"
    variant="outline"
    :disabled="disabled"
    :aria-label="label"
    @click="openPicker"
  >
    {{ label }}
    <input
      ref="inputRef"
      type="file"
      class="hidden"
      :accept="accept"
      :multiple="multiple"
      @change="onInputChange"
    />
  </UButton>
</template>
