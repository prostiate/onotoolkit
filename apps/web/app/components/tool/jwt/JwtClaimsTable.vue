<script setup lang="ts">
import type { ClaimRow, ClaimState } from "~/types/jwt";

defineProps<{ rows: ClaimRow[] }>();

const stateClass: Record<ClaimState, string> = {
  ok: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  error: "text-red-600 dark:text-red-400",
  neutral: "text-highlighted"
};
</script>

<template>
  <div class="divide-default divide-y">
    <div v-if="rows.length === 0" class="text-dimmed py-3 text-sm">No claims found.</div>
    <div v-for="row in rows" :key="row.key" class="space-y-0.5 py-2.5">
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-highlighted text-sm font-medium">
          {{ row.label }}
          <code class="text-dimmed text-xs font-normal">{{ row.key }}</code>
        </span>
        <span class="break-all text-right font-mono text-sm" :class="stateClass[row.state]">
          {{ row.value }}
        </span>
      </div>
      <p v-if="row.detail" class="text-right text-xs" :class="stateClass[row.state]">
        {{ row.detail }}
      </p>
      <p v-if="row.description" class="text-dimmed text-xs">{{ row.description }}</p>
    </div>
  </div>
</template>
