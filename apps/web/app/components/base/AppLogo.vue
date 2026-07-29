<script setup lang="ts">
import { Motion } from "motion-v";

const props = withDefaults(defineProps<{ size?: number }>(), { size: 34 });

interface Orbit {
  top: number;
  dot: number;
  duration: number;
  dir: 1 | -1;
  start: number;
  dotClass: string;
}

// Small "planets" orbiting the wrench at slightly different radii, speeds, and
// directions. `top` is the dot's distance from the top edge of the ring, so a
// larger value means a smaller orbit radius.
const orbits: Orbit[] = [
  { top: 0, dot: 3, duration: 7, dir: 1, start: 0, dotClass: "bg-cyan-400" },
  { top: 2.5, dot: 2, duration: 4.5, dir: -1, start: 140, dotClass: "bg-sky-300" },
  { top: 5, dot: 2.5, duration: 10, dir: 1, start: 255, dotClass: "bg-cyan-200" }
];

const chip = computed(() => Math.round(props.size * 0.74));
const icon = computed(() => Math.round(props.size * 0.44));

const reduce = ref(false);
onMounted(() => {
  reduce.value = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
});

function ringAnimate(orbit: Orbit): Record<string, number[]> | undefined {
  if (reduce.value) return undefined;
  return { rotate: [orbit.start, orbit.start + orbit.dir * 360] };
}
</script>

<template>
  <span
    class="relative inline-flex shrink-0 items-center justify-center"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  >
    <!-- Orbiting planets -->
    <Motion
      v-for="(orbit, i) in orbits"
      :key="i"
      class="pointer-events-none absolute inset-0"
      :initial="{ rotate: orbit.start }"
      :animate="ringAnimate(orbit)"
      :transition="{ duration: orbit.duration, ease: 'linear', repeat: Infinity }"
    >
      <span
        class="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_4px_currentColor]"
        :class="orbit.dotClass"
        :style="{ top: `${orbit.top}px`, width: `${orbit.dot}px`, height: `${orbit.dot}px` }"
      />
    </Motion>

    <!-- The wrench "sun" -->
    <span
      class="text-inverted relative z-10 flex items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-sm ring-1 ring-cyan-500/25"
      :style="{ width: `${chip}px`, height: `${chip}px` }"
    >
      <UIcon name="i-lucide-wrench" :style="{ width: `${icon}px`, height: `${icon}px` }" />
    </span>
  </span>
</template>
