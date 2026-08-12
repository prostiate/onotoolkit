<script setup lang="ts">
const store = useScreenRecorderStore();
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-highlighted text-sm font-semibold">Microphone</p>
        <p class="text-dimmed text-xs">Record your voice in the video.</p>
      </div>
      <UButton
        :icon="store.settings.micOn ? 'i-lucide-mic' : 'i-lucide-mic-off'"
        :color="store.settings.micOn ? 'primary' : 'neutral'"
        :variant="store.settings.micOn ? 'solid' : 'soft'"
        size="sm"
        :aria-label="store.settings.micOn ? 'Turn microphone off' : 'Turn microphone on'"
        @click="() => store.setMicOn(!store.settings.micOn)"
      >
        {{ store.settings.micOn ? "On" : "Off" }}
      </UButton>
    </div>

    <RecorderDeviceSelect
      v-if="store.settings.micOn"
      id="recorder-mic-device"
      label="Microphone"
      :devices="store.devices.microphones"
      :model-value="store.settings.micDeviceId"
      device-kind="microphone"
      @update:model-value="(id: string | null) => store.setMicDevice(id)"
    />

    <div class="border-default flex items-center justify-between gap-3 border-t pt-3">
      <div>
        <p class="text-highlighted text-sm font-semibold">System audio</p>
        <p class="text-dimmed text-xs">Capture the tab's sound (when you share a tab).</p>
      </div>
      <UButton
        :icon="store.settings.systemAudio ? 'i-lucide-volume-2' : 'i-lucide-volume-x'"
        :color="store.settings.systemAudio ? 'primary' : 'neutral'"
        :variant="store.settings.systemAudio ? 'solid' : 'soft'"
        size="sm"
        :aria-label="store.settings.systemAudio ? 'Turn system audio off' : 'Turn system audio on'"
        @click="store.setSystemAudio(!store.settings.systemAudio)"
      >
        {{ store.settings.systemAudio ? "On" : "Off" }}
      </UButton>
    </div>
  </div>
</template>
