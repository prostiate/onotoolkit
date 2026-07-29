<script setup lang="ts">
useSeoMeta({
  title: "JWT Debugger - Ono Toolkit",
  description:
    "Decode, verify, and generate JSON Web Tokens (RFC 7519) in your browser. HS/RS/PS/ES/EdDSA. Nothing is uploaded."
});

type Mode = "decode" | "encode";
const mode = ref<Mode>("decode");

const tabs: { value: Mode; label: string; icon: string }[] = [
  { value: "decode", label: "Decoder", icon: "i-lucide-scan-search" },
  { value: "encode", label: "Encoder", icon: "i-lucide-pen-line" }
];
</script>

<template>
  <ToolLayout
    title="JWT Debugger"
    description="Decode, verify, and generate JSON Web Tokens (RFC 7519)."
    icon="i-lucide-key-round"
    wide
    privacy-note="Your token, secret, and keys are processed locally and never leave your browser."
  >
    <div class="flex justify-center">
      <div class="border-default bg-default inline-flex rounded-lg border p-0.5">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors"
          :class="
            mode === tab.value ? 'bg-primary text-inverted' : 'text-muted hover:text-highlighted'
          "
          @click="mode = tab.value"
        >
          <UIcon :name="tab.icon" class="size-4" />
          {{ tab.label }}
        </button>
      </div>
    </div>

    <JwtDecoder v-if="mode === 'decode'" />
    <JwtEncoder v-else />
  </ToolLayout>
</template>
