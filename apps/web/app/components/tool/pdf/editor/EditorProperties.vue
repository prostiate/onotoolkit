<script setup lang="ts">
import type { EditorObject } from "~/types/editPdf";

const store = useEditPdfStore();

/** The object currently being styled, if it carries style props. */
const styled = computed(() => {
  const obj = store.selectedObject;
  if (!obj) return null;
  if (obj.type === "text" || obj.type === "image") return null;
  return obj;
});

const stroke = computed(() =>
  styled.value && "stroke" in styled.value ? styled.value.stroke : store.style.stroke
);
const fill = computed(() =>
  styled.value && "fill" in styled.value ? styled.value.fill : store.style.fill
);
const strokeWidth = computed(() =>
  styled.value && "strokeWidth" in styled.value ? styled.value.strokeWidth : store.style.strokeWidth
);
const opacity = computed(() =>
  styled.value && "opacity" in styled.value ? styled.value.opacity : store.style.opacity
);

const hasFill = computed(
  () =>
    !styled.value ||
    styled.value.type === "rect" ||
    styled.value.type === "ellipse" ||
    styled.value.type === "highlight" ||
    styled.value.type === "whiteout"
);

function apply(
  patch: Partial<EditorObject>,
  styleKey: keyof typeof store.style,
  value: unknown
): void {
  const obj = styled.value;
  if (obj) {
    store.pushHistory();
    store.updateObject(obj.id, patch);
  } else {
    store.setStyle({ [styleKey]: value } as Partial<typeof store.style>);
  }
}
</script>

<template>
  <div
    class="border-default bg-default flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-2.5"
  >
    <span class="text-muted text-xs font-medium">
      {{ styled ? "Selected item" : "New item style" }}
    </span>

    <label class="flex items-center gap-1.5 text-xs">
      <span class="text-muted">Colour</span>
      <input
        type="color"
        :value="stroke"
        class="border-default h-6 w-7 cursor-pointer rounded border bg-transparent p-0"
        aria-label="Stroke colour"
        @input="
          apply(
            { stroke: ($event.target as HTMLInputElement).value } as Partial<EditorObject>,
            'stroke',
            ($event.target as HTMLInputElement).value
          )
        "
      />
    </label>

    <label v-if="hasFill" class="flex items-center gap-1.5 text-xs">
      <span class="text-muted">Fill</span>
      <input
        type="color"
        :value="fill === 'transparent' ? '#ffffff' : fill"
        class="border-default h-6 w-7 cursor-pointer rounded border bg-transparent p-0"
        aria-label="Fill colour"
        @input="
          apply(
            { fill: ($event.target as HTMLInputElement).value } as Partial<EditorObject>,
            'fill',
            ($event.target as HTMLInputElement).value
          )
        "
      />
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        :aria-pressed="fill === 'transparent'"
        @click="apply({ fill: 'transparent' } as Partial<EditorObject>, 'fill', 'transparent')"
      >
        None
      </UButton>
    </label>

    <label class="flex items-center gap-2 text-xs">
      <span class="text-muted shrink-0">Width</span>
      <USlider
        :model-value="strokeWidth"
        :min="0"
        :max="20"
        :step="1"
        aria-label="Stroke width"
        class="w-24"
        @update:model-value="
          apply(
            { strokeWidth: ($event as number) ?? strokeWidth } as Partial<EditorObject>,
            'strokeWidth',
            ($event as number) ?? strokeWidth
          )
        "
      />
      <span class="text-dimmed w-4 tabular-nums">{{ strokeWidth }}</span>
    </label>

    <label class="flex items-center gap-2 text-xs">
      <span class="text-muted shrink-0">Opacity</span>
      <USlider
        :model-value="Math.round(opacity * 100)"
        :min="10"
        :max="100"
        :step="5"
        aria-label="Opacity"
        class="w-24"
        @update:model-value="
          apply(
            { opacity: (($event as number) ?? 100) / 100 } as Partial<EditorObject>,
            'opacity',
            (($event as number) ?? 100) / 100
          )
        "
      />
      <span class="text-dimmed w-8 tabular-nums">{{ Math.round(opacity * 100) }}%</span>
    </label>
  </div>
</template>
