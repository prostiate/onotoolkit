<script setup lang="ts">
defineProps<{
  loading: boolean;
  disabled: boolean;
}>();

const emit = defineEmits<{ submit: [] }>();

const url = defineModel<string>({ required: true });
</script>

<template>
  <form class="flex flex-col gap-2 sm:flex-row" @submit.prevent="emit('submit')">
    <UInput
      v-model="url"
      type="url"
      inputmode="url"
      placeholder="https://www.youtube.com/watch?v=..."
      icon="i-lucide-link"
      size="lg"
      class="flex-1"
      autocomplete="off"
      aria-label="YouTube video URL"
    />
    <UButton
      type="submit"
      size="lg"
      icon="i-lucide-search"
      :loading="loading"
      :disabled="disabled"
      class="justify-center"
    >
      Fetch video
    </UButton>
  </form>
</template>
