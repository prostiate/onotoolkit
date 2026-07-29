<script setup lang="ts">
import { resolveComponent } from "vue";
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

function onScroll(): void {
  scrolled.value = window.scrollY > 6;
}

function lockBody(locked: boolean): void {
  if (typeof document !== "undefined") document.body.style.overflow = locked ? "hidden" : "";
}

onMounted(() => {
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", onScroll);
  lockBody(false);
});

// Close the mobile menu on navigation; lock background scroll while it is open.
watch(
  () => route.fullPath,
  () => {
    open.value = false;
  }
);
watch(open, (value) => lockBody(value));

// Uniform nav-button width so Home / PDF / Developer / Text line up evenly.
const navItemClass =
  "flex h-9 w-28 items-center justify-center gap-1 rounded-lg text-sm font-medium transition-colors";
</script>

<template>
  <header class="sticky top-0 z-50 px-4 pt-3">
    <!-- Floating, fixed-width header card (not full-bleed). -->
    <div
      class="border-default bg-default/80 mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border px-3 py-2 backdrop-blur-md transition-shadow duration-300"
      :class="scrolled ? 'shadow-xl' : 'shadow-lg'"
    >
      <!-- Left: logo only (mobile) / full brand (desktop) -->
      <div class="col-start-1 flex items-center justify-self-start pl-1">
        <NuxtLink to="/" class="hidden items-center gap-2.5 md:flex">
          <AppLogo :size="34" />
          <span class="text-highlighted text-[15px] font-semibold tracking-tight">
            Ono <span class="text-primary">Toolkit</span>
          </span>
        </NuxtLink>
        <NuxtLink to="/" aria-label="Ono Toolkit" class="flex md:hidden">
          <AppLogo :size="34" />
        </NuxtLink>
      </div>

      <!-- Center: title on mobile, navigation on desktop -->
      <div class="col-start-2 flex items-center justify-center">
        <NuxtLink
          to="/"
          class="text-highlighted text-[15px] font-semibold tracking-tight md:hidden"
        >
          Ono <span class="text-primary">Toolkit</span>
        </NuxtLink>

        <nav class="hidden items-center justify-center gap-1 md:flex">
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

          <div v-for="menu in menus" :key="menu.id" class="group relative">
            <button
              type="button"
              :class="[
                navItemClass,
                'text-muted hover:text-highlighted hover:bg-muted group-focus-within:text-highlighted'
              ]"
              :aria-label="`${menu.title} tools`"
            >
              {{ menu.navLabel }}
              <UIcon
                name="i-lucide-chevron-down"
                class="size-3.5 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
              />
            </button>

            <div
              class="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
            >
              <div class="border-default bg-elevated w-80 rounded-xl border p-2 shadow-xl">
                <p class="text-dimmed px-2.5 pt-1 pb-2 text-xs font-medium tracking-wide uppercase">
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
            </div>
          </div>
        </nav>
      </div>

      <!-- Right controls -->
      <div class="col-start-3 flex items-center gap-1 justify-self-end">
        <ThemeToggle />
        <span class="border-default mx-0.5 hidden h-5 w-px border-l sm:block" />
        <UButton
          v-for="social in socials"
          :key="social.label"
          :to="social.to"
          :icon="social.icon"
          :aria-label="social.label"
          target="_blank"
          rel="noopener noreferrer"
          color="neutral"
          variant="ghost"
          size="sm"
          class="hidden sm:inline-flex"
        />
        <UButton
          :icon="open ? 'i-lucide-x' : 'i-lucide-menu'"
          :aria-label="open ? 'Close menu' : 'Open menu'"
          color="neutral"
          variant="ghost"
          size="sm"
          class="md:hidden"
          @click="open = !open"
        />
      </div>
    </div>

    <!-- Mobile menu (floating card; scrolls within itself) -->
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
          <UButton
            v-for="social in socials"
            :key="social.label"
            :to="social.to"
            :icon="social.icon"
            :aria-label="social.label"
            target="_blank"
            rel="noopener noreferrer"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </div>
      </div>
    </Transition>
  </header>
</template>
