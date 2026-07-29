<script setup lang="ts">
import { AnimatePresence, Motion } from "motion-v";

const STORAGE_KEY = "ono-toolkit-consent";
const visible = ref(false);

onMounted(() => {
  try {
    visible.value = localStorage.getItem(STORAGE_KEY) !== "accepted";
  } catch {
    visible.value = true;
  }
});

function accept(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "accepted");
  } catch {
    // ignore storage failures; just dismiss for this session
  }
  visible.value = false;
}
</script>

<template>
  <ClientOnly>
    <AnimatePresence>
      <Motion
        v-if="visible"
        :initial="{ opacity: 0, y: 28, scale: 0.98 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :exit="{ opacity: 0, y: 28, scale: 0.98 }"
        :transition="{ type: 'spring', stiffness: 260, damping: 24 }"
        class="fixed inset-x-4 bottom-4 z-50 sm:right-4 sm:left-auto sm:max-w-sm"
        role="dialog"
        aria-label="Privacy notice"
      >
        <div class="border-default bg-elevated rounded-xl border p-4 shadow-lg">
          <div class="flex items-start gap-3">
            <span
              class="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            >
              <UIcon name="i-lucide-shield-check" class="size-5" />
            </span>
            <div class="space-y-2">
              <p class="text-highlighted text-sm font-semibold">Private by design</p>
              <p class="text-muted text-xs leading-relaxed">
                Everything runs in your browser - your files and data never leave your device. No
                accounts, no tracking. We store only your theme preference locally. See our
                <NuxtLink to="/privacy" class="text-primary font-medium hover:underline">
                  privacy notice </NuxtLink
                >.
              </p>
              <div class="flex justify-end pt-1">
                <UButton size="sm" color="primary" @click="accept">Got it</UButton>
              </div>
            </div>
          </div>
        </div>
      </Motion>
    </AnimatePresence>
  </ClientOnly>
</template>
