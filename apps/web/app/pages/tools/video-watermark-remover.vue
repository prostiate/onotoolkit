<script setup lang="ts">
import { VIDEO_ACCEPT } from "~/schemas/videoWatermark";
import { VIDEO_DOWNLOAD_BYTES, videoCapabilityError } from "~/utils/videoWatermark";
import { formatBytes } from "~/utils/formatBytes";

useSeoMeta({
  title: "Gemini Video Watermark Remover - Ono Toolkit",
  description:
    "Remove supported visible Gemini and Veo watermarks locally. Compare the original and cleaned video, then download an MP4. Nothing is uploaded."
});
const store = useVideoWatermarkStore();
const { downloadBlob } = useFileDownload();
const capabilityError = ref<string | null>(null);
const mobileWarning = ref(false);
const settingsOpen = ref(false);
const bitrate = computed({
  get: () => store.settings.bitrateMbps,
  set: (value: number) => store.setSettings({ ...store.settings, bitrateMbps: value })
});
const bestEffort = computed({
  get: () => store.settings.allowLowConfidence,
  set: (value: boolean) => store.setSettings({ ...store.settings, allowLowConfidence: value })
});
const phaseLabel = computed(
  () =>
    ({
      detecting: "Detecting the watermark",
      "loading-model": "Loading the local processing model",
      processing: "Cleaning and encoding your video"
    })[store.progress?.phase ?? "detecting"]
);
const audioWarning = computed(
  () =>
    store.summary?.audioSkipReason &&
    !["no-audio-track", "disabled"].includes(store.summary.audioSkipReason)
);
onMounted(() => {
  store.hydrate();
  capabilityError.value = videoCapabilityError();
  mobileWarning.value = window.matchMedia("(pointer: coarse)").matches;
});
onBeforeUnmount(() => store.reset());
function download(): void {
  if (store.resultBlob) downloadBlob(store.resultBlob, store.resultName);
}
</script>

<template>
  <ToolLayout
    title="Gemini Video Watermark Remover"
    description="Clean supported Gemini and Veo clips on your device, then export an MP4."
    icon="i-lucide-film"
    wide
    privacy-note="Your video stays on your device. Processing runs locally and nothing is uploaded."
  >
    <div class="space-y-5">
      <UAlert
        v-if="capabilityError"
        color="warning"
        variant="soft"
        icon="i-lucide-monitor"
        title="Desktop Chrome or Edge recommended"
        :description="capabilityError"
      />
      <UAlert
        v-if="mobileWarning"
        color="warning"
        variant="soft"
        icon="i-lucide-monitor"
        title="Best on a desktop"
        description="Video cleanup uses considerable memory and processing power. Mobile browsers may stop partway through. Use a short clip on a desktop for the best results."
      >
        <template #actions
          ><UButton color="warning" variant="outline" @click="mobileWarning = false"
            >Try on this device</UButton
          ></template
        >
      </UAlert>
      <template v-if="!mobileWarning">
        <ToolDropzone
          v-if="!store.file"
          :accept="VIDEO_ACCEPT"
          hint="MP4, WebM or MOV - short clips up to 100 MB"
          label="Drop a Gemini or Veo video here, or browse"
          :disabled="!!capabilityError"
          @select="store.selectFile"
        />
        <UAlert
          v-if="store.addError"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :description="store.addError"
        />
        <UAlert
          v-if="store.error"
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Could not finish this video"
          :description="store.error"
        />
        <UAlert
          v-if="store.cancelled"
          color="info"
          variant="soft"
          description="Processing cancelled. Your original video is ready to use again."
        />

        <template v-if="store.file && store.sourceUrl">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-highlighted break-all text-sm font-semibold">{{ store.file.name }}</p>
              <p class="text-dimmed text-xs">
                {{ formatBytes(store.file.size)
                }}<template v-if="store.summary">
                  · {{ store.summary.metadata.width }} × {{ store.summary.metadata.height }} ·
                  {{ store.summary.processedFrames }} frames</template
                >
              </p>
            </div>
            <UBadge color="primary" variant="soft">{{
              store.status === "done" ? "Ready to download" : "Local processing"
            }}</UBadge>
          </div>
          <VideoCompare :original="store.sourceUrl" :processed="store.resultUrl" />

          <div
            v-if="store.isBusy"
            class="border-default bg-muted/30 space-y-3 rounded-xl border p-5"
            role="status"
            aria-live="polite"
          >
            <p class="text-highlighted text-sm font-medium">{{ phaseLabel }}</p>
            <UProgress
              :model-value="
                store.progress?.ratio == null ? null : Math.round(store.progress.ratio * 100)
              "
              aria-label="Video cleanup progress"
            />
            <p class="text-muted text-xs">
              <template v-if="store.progress?.processedFrames"
                >{{ store.progress.processedFrames
                }}<template v-if="store.progress.frameEstimate">
                  / {{ store.progress.frameEstimate }}</template
                >
                frames · </template
              >Keep this page open until processing finishes.
            </p>
            <UButton color="neutral" variant="outline" icon="i-lucide-x" @click="store.cancel()"
              >Cancel processing</UButton
            >
          </div>
          <template v-else>
            <UAlert
              v-if="store.summary && (!store.summary.confident || store.summary.skippedFrames > 0)"
              color="warning"
              variant="soft"
              title="Review the result"
              :description="`${store.summary.skippedFrames} frames were left unchanged. Detection was ${store.summary.confident ? 'confident' : 'best effort'}; some watermark detail may remain.`"
            />
            <UAlert
              v-if="audioWarning"
              color="warning"
              variant="soft"
              title="This export has no audio"
              description="The source audio could not be copied into MP4. The cleaned video is available, but its audio track was omitted."
            />
            <div class="flex flex-wrap gap-3">
              <UButton v-if="store.resultBlob" size="lg" icon="i-lucide-download" @click="download"
                >Download MP4</UButton
              >
              <UButton
                size="lg"
                :variant="store.resultBlob ? 'outline' : 'solid'"
                icon="i-lucide-sparkles"
                :disabled="!!capabilityError"
                @click="store.run()"
                >{{ store.resultBlob ? "Process again" : "Remove watermark" }}</UButton
              >
              <UButton
                size="lg"
                color="neutral"
                variant="outline"
                icon="i-lucide-rotate-ccw"
                @click="store.reset()"
                >New video</UButton
              >
            </div>
          </template>
          <UCollapsible
            v-model:open="settingsOpen"
            :disabled="store.isBusy"
            class="border-default rounded-xl border"
          >
            <UButton
              color="neutral"
              variant="ghost"
              block
              trailing-icon="i-lucide-chevron-down"
              class="justify-between p-4"
              :disabled="store.isBusy"
              >Export settings</UButton
            >
            <template #content>
              <div class="space-y-4 px-4 pb-4">
                <UFormField
                  label="Video quality"
                  description="Higher bitrates keep more detail and create larger files."
                >
                  <USelect
                    v-model="bitrate"
                    :items="[
                      { label: '8 Mbps - smaller file', value: 8 },
                      { label: '12 Mbps - recommended', value: 12 },
                      { label: '20 Mbps - high quality', value: 20 },
                      { label: '40 Mbps - maximum detail', value: 40 }
                    ]"
                    class="w-full sm:w-80"
                    :disabled="store.isBusy"
                  />
                </UFormField>
                <UCheckbox
                  v-model="bestEffort"
                  label="Allow best-effort removal"
                  description="Process even when detection is uncertain. Review the result for changes to nearby detail."
                  :disabled="store.isBusy"
                />
              </div>
            </template>
          </UCollapsible>
        </template>
      </template>
      <div class="border-default text-muted space-y-2 border-t pt-4 text-sm">
        <p>
          <span class="text-highlighted font-medium"
            >First use downloads about {{ Math.ceil(VIDEO_DOWNLOAD_BYTES / 1_000_000) }} MB</span
          >
          of model and runtime assets when you start processing. Your browser may cache them for
          later visits.
        </p>
        <p>
          Targets supported visible Gemini and Veo watermarks. Other logos and captions are outside
          its scope. Video is re-encoded to MP4; compatible audio is preserved.
        </p>
        <p class="text-dimmed text-xs">
          Powered by
          <a
            href="https://github.com/GargantuaX/gemini-watermark-remover"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary underline"
            >Gemini Watermark Remover</a
          >
          and
          <a
            href="https://github.com/allenk/GeminiWatermarkTool"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary underline"
            >allenk's FDnCNN model</a
          >
          (MIT). For large clips, use the
          <a
            href="https://github.com/GargantuaX/gemini-watermark-remover#cli"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary underline"
            >upstream CLI</a
          >.
        </p>
      </div>
    </div>
  </ToolLayout>
</template>
