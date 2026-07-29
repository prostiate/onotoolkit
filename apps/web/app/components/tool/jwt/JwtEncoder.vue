<script setup lang="ts">
import { SIGNING_ALGORITHMS } from "~/utils/jwt";

const store = useJwtEncoderStore();
const algorithms: string[] = [...SIGNING_ALGORITHMS];

const algModel = computed<string>({
  get: () => store.alg,
  set: (value) => store.setAlg(value)
});

onMounted(() => {
  void store.encode();
});

watch(
  () => [
    store.header,
    store.payload,
    store.alg,
    store.secret,
    store.secretBase64Url,
    store.privateKey
  ],
  () => {
    void store.encode();
  }
);

async function copyToken(): Promise<void> {
  if (store.token) await navigator.clipboard.writeText(store.token);
}
</script>

<template>
  <div class="grid gap-5 lg:grid-cols-2 lg:items-stretch">
    <!-- Left: claims + signing -->
    <div class="flex flex-col gap-5">
      <AppCard>
        <div class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-highlighted text-sm font-semibold">Algorithm & claims</p>
            <div class="flex items-center gap-1.5">
              <USelect v-model="algModel" :items="algorithms" size="xs" class="w-28" />
              <UButton size="xs" color="neutral" variant="soft" @click="store.loadExample()">
                Generate example
              </UButton>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-muted text-xs font-medium">Header</label>
            <UTextarea v-model="store.header" :rows="4" class="w-full font-mono text-xs" />
          </div>

          <div class="space-y-1">
            <label class="text-muted text-xs font-medium">Payload</label>
            <UTextarea v-model="store.payload" :rows="7" class="w-full font-mono text-xs" />
          </div>
        </div>
      </AppCard>

      <AppCard class="lg:flex lg:flex-1 lg:flex-col">
        <div class="space-y-3">
          <p class="text-highlighted text-sm font-semibold">Signing key</p>

          <div v-if="store.keyKind === 'secret'" class="space-y-2">
            <UInput
              v-model="store.secret"
              placeholder="HMAC secret"
              autocomplete="off"
              class="w-full"
            />
            <label class="text-muted flex items-center gap-2 text-xs">
              <USwitch v-model="store.secretBase64Url" size="sm" />
              Secret is Base64URL encoded
            </label>
          </div>

          <UTextarea
            v-else
            v-model="store.privateKey"
            :rows="6"
            placeholder="Private key (PKCS8 PEM -----BEGIN PRIVATE KEY----- or JWK JSON)"
            class="w-full font-mono text-xs"
          />

          <UAlert
            v-if="store.error"
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            :description="store.error"
          />
        </div>
      </AppCard>
    </div>

    <!-- Right: encoded output -->
    <div class="flex flex-col gap-5">
      <AppCard class="lg:flex lg:flex-1 lg:flex-col">
        <div class="space-y-2 lg:flex lg:h-full lg:flex-col">
          <div class="flex items-center justify-between gap-2">
            <p class="text-highlighted text-sm font-semibold">Encoded token</p>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-copy"
              :disabled="!store.token"
              aria-label="Copy token"
              @click="copyToken()"
            />
          </div>
          <JwtTokenEditor
            v-if="store.token"
            :model-value="store.token"
            readonly
            class="lg:flex-1"
            @update:model-value="() => {}"
          />
          <p
            v-else
            class="text-muted flex py-6 text-center text-sm lg:flex-1 lg:items-center lg:justify-center"
          >
            Fill in the claims and a signing key to produce a token.
          </p>
        </div>
      </AppCard>
    </div>
  </div>
</template>
