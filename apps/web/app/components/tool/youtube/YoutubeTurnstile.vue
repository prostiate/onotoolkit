<script setup lang="ts">
// Renders a Cloudflare Turnstile widget and exposes its token via v-model. When
// no site key is configured (local/dev/tests) it renders nothing and the token
// stays empty, so the flow degrades gracefully.
const token = defineModel<string>({ default: "" });

const config = useRuntimeConfig();
const siteKey = String(config.public.turnstileSiteKey ?? "");

const el = ref<HTMLElement | null>(null);
let widgetId: string | null = null;

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src^="https://challenges.cloudflare.com/turnstile"]`
  );
  if (existing) {
    return new Promise((resolve) =>
      existing.addEventListener("load", () => resolve(), { once: true })
    );
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(script);
  });
}

onMounted(async () => {
  if (!siteKey || !el.value) return;
  try {
    await loadScript();
  } catch {
    return;
  }
  if (!window.turnstile || !el.value) return;
  widgetId = window.turnstile.render(el.value, {
    sitekey: siteKey,
    callback: (value: string) => (token.value = value),
    "error-callback": () => (token.value = ""),
    "expired-callback": () => (token.value = "")
  });
});

onBeforeUnmount(() => {
  if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
});

// Turnstile tokens are single-use; reset after each download for a fresh one.
function reset(): void {
  token.value = "";
  if (widgetId && window.turnstile) window.turnstile.reset(widgetId);
}

defineExpose({ reset });
</script>

<template>
  <div v-if="siteKey" ref="el" class="cf-turnstile" />
</template>
