<script setup lang="ts">
type SegClass = "h" | "p" | "s" | "dot";
interface Seg {
  text: string;
  cls: SegClass;
}

const props = defineProps<{ modelValue: string; placeholder?: string; readonly?: boolean }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const model = computed<string>({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
});

const classMap: Record<SegClass, string> = {
  h: "text-fuchsia-600 dark:text-fuchsia-400",
  p: "text-sky-700 dark:text-sky-300",
  s: "text-amber-600 dark:text-amber-400",
  dot: "text-dimmed"
};

const segments = computed<Seg[]>(() => {
  const raw = props.modelValue;
  if (!raw) return [];
  const out: Seg[] = [];
  const parts = raw.split(".");
  parts.forEach((part, index) => {
    if (index > 0) out.push({ text: ".", cls: "dot" });
    if (part) out.push({ text: part, cls: index === 0 ? "h" : index === 1 ? "p" : "s" });
  });
  return out;
});
</script>

<template>
  <div class="border-default bg-muted/40 relative rounded-lg border">
    <pre
      aria-hidden="true"
      class="pointer-events-none min-h-28 p-3 font-mono text-sm leading-relaxed break-all whitespace-pre-wrap"
    ><span v-for="(seg, index) in segments" :key="index" :class="classMap[seg.cls]">{{ seg.text }}</span></pre>
    <textarea
      v-model="model"
      :placeholder="placeholder"
      :readonly="readonly"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      class="caret-primary placeholder:text-dimmed absolute inset-0 h-full w-full resize-none bg-transparent p-3 font-mono text-sm leading-relaxed break-all whitespace-pre-wrap text-transparent outline-none"
      aria-label="Encoded JWT"
    />
  </div>
</template>
