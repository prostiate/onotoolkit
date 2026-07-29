<script setup lang="ts">
import { Motion } from "motion-v";

const enabled = ref(false);
const pos = ref({ x: -100, y: -100 });

function onMove(event: PointerEvent): void {
  pos.value = { x: event.clientX, y: event.clientY };
}

onMounted(() => {
  enabled.value = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? false;
  if (enabled.value) window.addEventListener("pointermove", onMove, { passive: true });
});
onBeforeUnmount(() => window.removeEventListener("pointermove", onMove));
</script>

<template>
  <ClientOnly>
    <Motion
      v-if="enabled"
      class="pointer-events-none fixed left-0 top-0 z-[9999] hidden md:block"
      :animate="{ x: pos.x, y: pos.y }"
      :transition="{ type: 'spring', stiffness: 260, damping: 22, mass: 0.4 }"
      aria-hidden="true"
    >
      <!-- glowing core -->
      <span
        class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/40 blur-[2px]"
        style="width: 10px; height: 10px"
      />
      <span
        class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500"
        style="width: 4px; height: 4px"
      />

      <!-- outer orbiting planet -->
      <Motion
        class="absolute -translate-x-1/2 -translate-y-1/2"
        style="width: 36px; height: 36px"
        :animate="{ rotate: 360 }"
        :transition="{ repeat: Infinity, duration: 2.8, ease: 'linear' }"
      >
        <span
          class="absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]"
          style="width: 6px; height: 6px"
        />
      </Motion>

      <!-- inner counter-orbiting moon -->
      <Motion
        class="absolute -translate-x-1/2 -translate-y-1/2"
        style="width: 20px; height: 20px"
        :animate="{ rotate: -360 }"
        :transition="{ repeat: Infinity, duration: 1.8, ease: 'linear' }"
      >
        <span
          class="absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-sky-300"
          style="width: 3.5px; height: 3.5px"
        />
      </Motion>
    </Motion>
  </ClientOnly>
</template>
