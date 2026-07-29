<script setup lang="ts">
import { resolveComponent } from "vue";
import { AnimatePresence, Motion } from "motion-v";
import { toolGroups, getToolsByGroup } from "~/tools/registry";

const NuxtLink = resolveComponent("NuxtLink");
const route = useRoute();

const menus = toolGroups.map((group) => ({
  id: group.id,
  title: group.title,
  description: group.description,
  navLabel: group.id === "text" ? "Text" : group.title,
  tools: getToolsByGroup(group.id)
}));

const socials = [
  { label: "GitHub", icon: "i-lucide-github", to: "https://github.com/prostiate/onotoolkit" },
  {
    label: "LinkedIn",
    icon: "i-lucide-linkedin",
    to: "https://www.linkedin.com/in/muhammad-irfan-kurniawan"
  }
];

const open = ref(false);
const scrolled = ref(false);
const openMenu = ref<string | null>(null);

function onScroll(): void {
  scrolled.value = window.scrollY > 6;
}

function lockBody(locked: boolean): void {
  if (typeof document !== "undefined") document.body.style.overflow = locked ? "hidden" : "";
}

function onMenuBlur(event: FocusEvent, id: string): void {
  const container = event.currentTarget as HTMLElement;
  if (!container.contains(event.relatedTarget as Node | null) && openMenu.value === id) {
    openMenu.value = null;
  }
}

onMounted(() => {
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
  lockBody(false);
});

watch(
  () => route.fullPath,
  () => {
    open.value = false;
    openMenu.value = null;
  }
);
watch(open, (value) => lockBody(value));

const navItemClass =
  "flex h-9 w-28 items-center justify-center gap-1 rounded-lg text-sm font-medium transition-colors";
</script>

<template>
  <header class="sticky top-0 z-50 px-4 pt-3">
    <div
      class="border-default bg-default/80 mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border px-3 py-2 backdrop-blur-md transition-shadow duration-300"
      :class="scrolled ? 'shadow-xl' : 'shadow-lg'"
    >
      <!-- Left: logo (mobile) / full brand (desktop) -->
      <div class="col-start-1 flex items-center justify-self-start pl-1">
        <NuxtLink to="/" class="hidden items-center gap-2.5 md:flex">
          <AppLogo :size="34" />
          <BrandTitle />
        </NuxtLink>
        <NuxtLink to="/" aria-label="Ono Toolkit" class="flex md:hidden">
          <AppLogo :size="34" />
        </NuxtLink>
      </div>

      <!-- Center: title on mobile, navigation on desktop -->
      <div class="col-start-2 flex items-center justify-center">
        <NuxtLink to="/" class="md:hidden">
          <BrandTitle />
        </NuxtLink>

        <nav class="hidden items-center justify-center gap-1 md:flex">
          <Motion :while-hover="{ scale: 1.04 }" :while-press="{ scale: 0.96 }" class="inline-flex">
            <NuxtLink
              to="/"
              :class="[
                navItemClass,
                route.path === '/'
                  ? 'text-highlighted bg-muted'
                  : 'text-muted hover:text-highlighted hover:bg-muted'
              ]"
            >
              Home
            </NuxtLink>
          </Motion>

          <div
            v-for="menu in menus"
            :key="menu.id"
            class="relative"
            @mouseenter="openMenu = menu.id"
            @mouseleave="openMenu = null"
            @focusin="openMenu = menu.id"
            @focusout="onMenuBlur($event, menu.id)"
          >
            <Motion
              :while-hover="{ scale: 1.04 }"
              :while-press="{ scale: 0.96 }"
              class="inline-flex"
            >
              <button
                type="button"
                :class="[
                  navItemClass,
                  openMenu === menu.id
                    ? 'text-highlighted bg-muted'
                    : 'text-muted hover:text-highlighted hover:bg-muted'
                ]"
                :aria-label="`${menu.title} tools`"
                :aria-expanded="openMenu === menu.id"
              >
                {{ menu.navLabel }}
                <Motion :animate="{ rotate: openMenu === menu.id ? 180 : 0 }" class="flex">
                  <UIcon name="i-lucide-chevron-down" class="size-3.5" />
                </Motion>
              </button>
            </Motion>

            <AnimatePresence>
              <Motion
                v-if="openMenu === menu.id"
                class="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3"
                :initial="{ opacity: 0, y: 6, scale: 0.98 }"
                :animate="{ opacity: 1, y: 0, scale: 1 }"
                :exit="{ opacity: 0, y: 6, scale: 0.98 }"
                :transition="{ duration: 0.16, ease: 'easeOut' }"
              >
                <div class="border-default bg-elevated w-80 rounded-xl border p-2 shadow-xl">
                  <p
                    class="text-dimmed px-2.5 pt-1 pb-2 text-xs font-medium tracking-wide uppercase"
                  >
                    {{ menu.description }}
                  </p>
                  <component
                    :is="tool.route ? NuxtLink : 'div'"
                    v-for="tool in menu.tools"
                    :key="tool.slug"
                    :to="tool.route ?? undefined"
                    class="flex items-start gap-3 rounded-lg p-2.5 transition-colors"
                    :class="tool.route ? 'hover:bg-muted cursor-pointer' : 'cursor-default'"
                  >
                    <span
                      class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      :class="tool.route ? 'bg-primary/10 text-primary' : 'bg-muted text-dimmed'"
                    >
                      <UIcon :name="tool.icon" class="size-4" />
                    </span>
                    <span class="min-w-0">
                      <span class="flex items-center gap-1.5">
                        <span
                          class="text-sm font-medium"
                          :class="tool.route ? 'text-highlighted' : 'text-muted'"
                        >
                          {{ tool.title }}
                        </span>
                        <UBadge v-if="!tool.route" color="neutral" variant="soft" size="xs">
                          Soon
                        </UBadge>
                      </span>
                      <span class="text-dimmed line-clamp-1 block text-xs">
                        {{ tool.description }}
                      </span>
                    </span>
                  </component>
                </div>
              </Motion>
            </AnimatePresence>
          </div>
        </nav>
      </div>

      <!-- Right controls -->
      <div class="col-start-3 flex items-center gap-1 justify-self-end">
        <ThemeToggle />
        <span class="border-default mx-0.5 hidden h-5 w-px border-l sm:block" />
        <Motion
          v-for="social in socials"
          :key="social.label"
          :while-hover="{ y: -2, scale: 1.15 }"
          :while-press="{ scale: 0.85 }"
          class="hidden sm:inline-flex"
        >
          <UButton
            :to="social.to"
            :icon="social.icon"
            :aria-label="social.label"
            target="_blank"
            rel="noopener noreferrer"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </Motion>

        <Motion
          :while-hover="{ scale: 1.1 }"
          :while-press="{ scale: 0.9 }"
          class="inline-flex md:hidden"
        >
          <button
            type="button"
            class="text-muted hover:bg-muted flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg transition-colors"
            :aria-label="open ? 'Close menu' : 'Open menu'"
            @click="open = !open"
          >
            <AnimatePresence mode="wait" :initial="false">
              <Motion
                :key="open ? 'x' : 'menu'"
                :initial="{ rotate: -90, opacity: 0, scale: 0.5 }"
                :animate="{ rotate: 0, opacity: 1, scale: 1 }"
                :exit="{ rotate: 90, opacity: 0, scale: 0.5 }"
                :transition="{ duration: 0.2, ease: 'easeOut' }"
                class="flex"
              >
                <UIcon :name="open ? 'i-lucide-x' : 'i-lucide-menu'" class="size-5" />
              </Motion>
            </AnimatePresence>
          </button>
        </Motion>
      </div>
    </div>

    <!-- Mobile menu -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="open"
        class="border-default bg-default/95 mx-auto mt-2 max-h-[calc(100dvh-6rem)] max-w-7xl space-y-4 overflow-y-auto overscroll-contain rounded-2xl border p-4 shadow-lg backdrop-blur-md md:hidden"
      >
        <NuxtLink to="/" class="text-highlighted block rounded-md px-2 py-2 text-sm font-semibold">
          Home
        </NuxtLink>

        <div v-for="menu in menus" :key="menu.id" class="space-y-1">
          <p class="text-dimmed px-2 text-xs font-medium tracking-wide uppercase">
            {{ menu.title }}
          </p>
          <component
            :is="tool.route ? NuxtLink : 'div'"
            v-for="tool in menu.tools"
            :key="tool.slug"
            :to="tool.route ?? undefined"
            class="flex items-center gap-3 rounded-lg px-2 py-2"
            :class="tool.route ? 'hover:bg-muted' : ''"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              :class="tool.route ? 'bg-primary/10 text-primary' : 'bg-muted text-dimmed'"
            >
              <UIcon :name="tool.icon" class="size-4" />
            </span>
            <span class="flex items-center gap-1.5">
              <span
                class="text-sm font-medium"
                :class="tool.route ? 'text-highlighted' : 'text-muted'"
              >
                {{ tool.title }}
              </span>
              <UBadge v-if="!tool.route" color="neutral" variant="soft" size="xs">Soon</UBadge>
            </span>
          </component>
        </div>

        <div class="border-default flex items-center gap-1 border-t pt-3">
          <Motion
            v-for="social in socials"
            :key="social.label"
            :while-hover="{ y: -2, scale: 1.15 }"
            :while-press="{ scale: 0.85 }"
            class="inline-flex"
          >
            <UButton
              :to="social.to"
              :icon="social.icon"
              :aria-label="social.label"
              target="_blank"
              rel="noopener noreferrer"
              color="neutral"
              variant="ghost"
              size="sm"
            />
          </Motion>
        </div>
      </div>
    </Transition>
  </header>
</template>
