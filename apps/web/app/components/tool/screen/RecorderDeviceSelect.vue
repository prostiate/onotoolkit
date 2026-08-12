<script setup lang="ts">
import { formatDeviceLabel } from "~/utils/screenRecorder";

const props = defineProps<{
  label: string;
  id: string;
  devices: MediaDeviceInfo[];
  modelValue: string | null;
  deviceKind: "camera" | "microphone";
}>();

const emit = defineEmits<{ "update:model-value": [deviceId: string | null] }>();

const items = computed(() => [
  { label: "Default", value: null as string | null },
  ...props.devices.map((device) => ({
    label: formatDeviceLabel(device, props.deviceKind),
    value: device.deviceId
  }))
]);

function onChange(value: unknown): void {
  if (value === null || value === "") {
    emit("update:model-value", null);
    return;
  }
  if (typeof value === "string") emit("update:model-value", value);
}
</script>

<template>
  <div>
    <label class="text-muted mb-1.5 block text-xs font-medium" :for="id">{{ label }}</label>
    <USelect
      :id="id"
      :model-value="modelValue"
      :items="items"
      value-key="value"
      size="sm"
      block
      @update:model-value="onChange"
    />
  </div>
</template>
