<script setup lang="ts">
import { describeClaims, tokenValidity, SIGNING_ALGORITHMS } from "~/utils/jwt";

const store = useJwtStore();
const algorithms: string[] = [...SIGNING_ALGORITHMS];

const tokenModel = computed<string>({
  get: () => store.token,
  set: (value) => store.setToken(value)
});

const nowSeconds = ref(0);
onMounted(() => {
  nowSeconds.value = Math.floor(Date.now() / 1000);
});

const claims = computed(() =>
  store.decoded ? describeClaims(store.decoded.payload, nowSeconds.value) : []
);
const validity = computed(() =>
  store.decoded ? tokenValidity(store.decoded.payload, nowSeconds.value) : null
);

const statusMeta = computed(() => {
  switch (store.status) {
    case "valid":
      return {
        color: "success" as const,
        icon: "i-lucide-shield-check",
        label: "Signature verified"
      };
    case "invalid":
      return { color: "error" as const, icon: "i-lucide-shield-x", label: "Invalid signature" };
    case "verifying":
      return { color: "neutral" as const, icon: "i-lucide-loader-circle", label: "Verifying..." };
    case "error":
      return { color: "warning" as const, icon: "i-lucide-triangle-alert", label: "Cannot verify" };
    default:
      return { color: "neutral" as const, icon: "i-lucide-shield", label: "Not verified" };
  }
});

async function copyJson(value: Record<string, unknown>): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
}
</script>

<template>
  <div class="grid gap-5 lg:grid-cols-2">
    <!-- Left: encoded token + verification -->
    <div class="space-y-5">
      <AppCard>
        <div class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-highlighted text-sm font-semibold">Encoded token</p>
            <div class="flex items-center gap-1.5">
              <USelect v-model="store.exampleAlg" :items="algorithms" size="xs" class="w-28" />
              <UButton size="xs" color="neutral" variant="soft" @click="store.generateFor()">
                Generate example
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                :disabled="!store.token"
                @click="store.clear()"
              >
                Clear
              </UButton>
            </div>
          </div>

          <JwtTokenEditor
            v-model="tokenModel"
            placeholder="Paste a JWT (header.payload.signature)"
          />

          <div v-if="store.decoded" class="flex flex-wrap items-center gap-2">
            <UBadge color="neutral" variant="soft" size="sm">alg: {{ store.alg || "?" }}</UBadge>
            <UBadge v-if="validity?.expired" color="error" variant="soft" size="sm">Expired</UBadge>
            <UBadge v-else-if="validity?.notYetValid" color="warning" variant="soft" size="sm">
              Not yet active
            </UBadge>
          </div>

          <UAlert
            v-if="store.decodeError"
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            :description="store.decodeError"
          />
          <UAlert
            v-else-if="store.isAlgNone"
            color="warning"
            variant="soft"
            icon="i-lucide-shield-alert"
            title="Unsigned token (alg: none)"
            description="This token has no signature. Never trust an unsigned token in production."
          />
        </div>
      </AppCard>

      <AppCard v-if="store.decoded && !store.isAlgNone">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-highlighted text-sm font-semibold">Verify signature</p>
            <USwitch v-model="store.verifyEnabled" />
          </div>

          <template v-if="store.verifyEnabled">
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
              v-else-if="store.keyKind === 'public'"
              v-model="store.publicKey"
              :rows="5"
              placeholder="Public key (PEM -----BEGIN PUBLIC KEY----- or JWK JSON)"
              class="w-full font-mono text-xs"
            />

            <p v-else class="text-muted text-xs">
              Verification is not supported for this algorithm.
            </p>

            <div class="flex items-center gap-2">
              <UButton
                color="primary"
                icon="i-lucide-shield-check"
                :loading="store.status === 'verifying'"
                :disabled="store.keyKind === 'unsupported'"
                @click="store.verify()"
              >
                Verify
              </UButton>
              <UBadge :color="statusMeta.color" variant="soft" size="md">
                <UIcon
                  :name="statusMeta.icon"
                  class="mr-1 size-3.5"
                  :class="store.status === 'verifying' ? 'animate-spin' : ''"
                />
                {{ statusMeta.label }}
              </UBadge>
            </div>
            <p v-if="store.verifyMessage" class="text-muted text-xs">{{ store.verifyMessage }}</p>
          </template>
        </div>
      </AppCard>
    </div>

    <!-- Right: decoded -->
    <div class="space-y-5">
      <AppCard v-if="store.decoded">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <p class="text-highlighted text-sm font-semibold">Header</p>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-copy"
              aria-label="Copy header"
              @click="copyJson(store.decoded.header)"
            />
          </div>
          <JsonHighlight :value="store.decoded.header" />
        </div>
      </AppCard>

      <AppCard v-if="store.decoded">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-highlighted text-sm font-semibold">Payload</p>
            <div class="flex items-center gap-1">
              <div class="border-default flex overflow-hidden rounded-md border">
                <button
                  type="button"
                  class="px-2 py-1 text-xs"
                  :class="store.view === 'json' ? 'bg-primary text-inverted' : 'text-muted'"
                  @click="store.setView('json')"
                >
                  JSON
                </button>
                <button
                  type="button"
                  class="px-2 py-1 text-xs"
                  :class="store.view === 'claims' ? 'bg-primary text-inverted' : 'text-muted'"
                  @click="store.setView('claims')"
                >
                  Claims
                </button>
              </div>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-copy"
                aria-label="Copy payload"
                @click="copyJson(store.decoded.payload)"
              />
            </div>
          </div>
          <JsonHighlight v-if="store.view === 'json'" :value="store.decoded.payload" />
          <JwtClaimsTable v-else :rows="claims" />
        </div>
      </AppCard>

      <AppCard v-if="!store.decoded && !store.decodeError">
        <p class="text-muted py-6 text-center text-sm">
          Paste a JWT on the left to decode its header and payload here.
        </p>
      </AppCard>
    </div>
  </div>
</template>
