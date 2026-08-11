<script setup lang="ts">
import { resolveComponent } from "vue";
import { AnimatePresence, Motion } from "motion-v";
import type { ToolGroupId } from "~/types/tools";
import { toolGroups, getToolsByGroup } from "~/tools/registry";

const NuxtLink = resolveComponent("NuxtLink");
const route = useRoute();

// A representative icon per group, used for the nav triggers and the mobile
// accordion rows. Kept here rather than in the registry because it is purely a
// navigation affordance.
const groupIcon: Record<ToolGroupId, string> = {
  pdf: "i-lucide-file-text",
  developer: "i-lucide-terminal",
  text: "i-lucide-type",
  image: "i-lucide-image"
};

const menus = toolGroups.map((group) => {
  const tools = getToolsByGroup(group.id);
  return {
    id: group.id,
    title: group.title,
    description: group.description,
    navLabel: group.id === "text" ? "Text" : group.title,
    icon: groupIcon[group.id],
    tools,
    // Wide groups fan out into two columns so the panel reads horizontally
    // instead of running off the bottom of the screen.
    columns: tools.length > 6 ? 2 : 1
  };
});

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
const openGroup = ref<string | null>(null);
const reduce = ref(false);

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

function toggleGroup(id: string): void {
  openGroup.value = openGroup.value === id ? null : id;
}

onMounted(() => {
  onScroll();
  reduce.value = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
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
    openGroup.value = null;
  }
);
watch(open, (value) => lockBody(value));

// Panel reveal timing. When motion is reduced we snap instead of sliding.
function panelTransition(): Record<string, unknown> {
  return reduce.value ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] };
}
function itemDelay(index: number): number {
  return reduce.value ? 0 : 0.03 + index * 0.022;
}
function sectionTransition(): Record<string, unknown> {
  return reduce.value ? { duration: 0 } : { duration: 0.24, ease: [0.16, 1, 0.3, 1] };
}

const navItemClass =
  "flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors";
</script>

<template>
  <header class="sticky top-0 z-50 px-4 pt-3">
    <div
      class="border-default bg-default/80 mx-auto flex max-w-[96rem] items-center gap-3 rounded-2xl border px-3 py-2 backdrop-blur-md transition-shadow duration-300"
      :class="scrolled ? 'shadow-xl' : 'shadow-lg'"
    >
      <!-- Left: brand -->
      <div class="flex flex-1 items-center">
        <NuxtLink
          to="/"
          class="flex shrink-0 items-center gap-2.5 pl-1"
          aria-label="Ono Toolkit home"
        >
          <AppLogo :size="34" />
          <BrandTitle class="hidden whitespace-nowrap sm:inline-block" />
        </NuxtLink>
      </div>

      <!-- Center: desktop navigation with mega-menu panels -->
      <nav class="hidden items-center justify-center gap-0.5 md:flex">
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
          class="static"
          @mouseenter="openMenu = menu.id"
          @mouseleave="openMenu = null"
          @focusin="openMenu = menu.id"
          @focusout="onMenuBlur($event, menu.id)"
        >
          <Motion :while-hover="{ scale: 1.04 }" :while-press="{ scale: 0.96 }" class="inline-flex">
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

          <!-- Mega panel: anchored to the header row, centered, never wider
               than the viewport. Two columns for large groups. -->
          <AnimatePresence>
            <Motion
              v-if="openMenu === menu.id"
              class="absolute inset-x-0 top-full z-50 flex justify-center px-4 pt-3"
              :initial="{ opacity: 0, y: 8 }"
              :animate="{ opacity: 1, y: 0 }"
              :exit="{ opacity: 0, y: 8 }"
              :transition="panelTransition()"
            >
              <div
                class="border-default bg-elevated max-h-[min(70vh,32rem)] w-full overflow-y-auto rounded-2xl border p-3 shadow-2xl"
                :class="menu.columns === 2 ? 'max-w-2xl' : 'max-w-sm'"
              >
                <div
                  class="grid gap-0.5"
                  :class="menu.columns === 2 ? 'grid-cols-2' : 'grid-cols-1'"
                >
                  <Motion
                    v-for="(tool, index) in menu.tools"
                    :key="tool.slug"
                    :initial="{ opacity: 0, y: 6 }"
                    :animate="{ opacity: 1, y: 0 }"
                    :transition="{ ...panelTransition(), delay: itemDelay(index) }"
                  >
                    <component
                      :is="tool.route ? NuxtLink : 'div'"
                      :to="tool.route ?? undefined"
                      class="group flex items-start gap-3 rounded-xl p-2.5 transition-colors"
                      :class="tool.route ? 'hover:bg-muted cursor-pointer' : 'cursor-default'"
                    >
                      <span
                        class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors"
                        :class="
                          tool.route
                            ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-inverted'
                            : 'bg-muted text-dimmed'
                        "
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
                  </Motion>
                </div>
              </div>
            </Motion>
          </AnimatePresence>
        </div>
      </nav>

      <!-- Right controls -->
      <div class="flex flex-1 items-center justify-end gap-1">
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
            :aria-expanded="open"
            @click="open = !open"
          >
            <AnimatePresence mode="wait" :initial="false">
              <Motion
                :key="open ? 'x' : 'menu'"
                :initial="{ rotate: -90, opacity: 0, scale: 0.5 }"
                :animate="{ rotate: 0, opacity: 1, scale: 1 }"
                :exit="{ rotate: 90, opacity: 0, scale: 0.5 }"
                :transition="{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }"
                class="flex"
              >
                <UIcon :name="open ? 'i-lucide-x' : 'i-lucide-menu'" class="size-5" />
              </Motion>
            </AnimatePresence>
          </button>
        </Motion>
      </div>
    </div>

    <!-- Mobile menu: accordion by group instead of one long tool dump -->
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
        class="border-default bg-default/95 mx-auto mt-2 max-h-[calc(100dvh-6rem)] max-w-[96rem] space-y-1.5 overflow-y-auto overscroll-contain rounded-2xl border p-3 shadow-lg backdrop-blur-md md:hidden"
      >
        <NuxtLink
          to="/"
          class="text-highlighted flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold"
          :class="route.path === '/' ? 'bg-muted' : 'hover:bg-muted'"
        >
          <span
            class="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg"
          >
            <UIcon name="i-lucide-home" class="size-4" />
          </span>
          Home
        </NuxtLink>

        <div v-for="menu in menus" :key="menu.id" class="border-default border-t pt-1.5">
          <button
            type="button"
            class="hover:bg-muted flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
            :aria-expanded="openGroup === menu.id"
            @click="toggleGroup(menu.id)"
          >
            <span
              class="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg"
            >
              <UIcon :name="menu.icon" class="size-4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="text-highlighted block text-sm font-semibold">{{ menu.title }}</span>
              <span class="text-dimmed line-clamp-1 block text-xs">{{ menu.description }}</span>
            </span>
            <Motion :animate="{ rotate: openGroup === menu.id ? 180 : 0 }" class="text-dimmed flex">
              <UIcon name="i-lucide-chevron-down" class="size-4" />
            </Motion>
          </button>

          <AnimatePresence :initial="false">
            <Motion
              v-if="openGroup === menu.id"
              class="overflow-hidden"
              :initial="{ height: 0, opacity: 0 }"
              :animate="{ height: 'auto', opacity: 1 }"
              :exit="{ height: 0, opacity: 0 }"
              :transition="sectionTransition()"
            >
              <div class="space-y-0.5 py-1 pl-2">
                <component
                  :is="tool.route ? NuxtLink : 'div'"
                  v-for="tool in menu.tools"
                  :key="tool.slug"
                  :to="tool.route ?? undefined"
                  class="flex items-center gap-3 rounded-lg px-3 py-2"
                  :class="tool.route ? 'hover:bg-muted' : ''"
                >
                  <span
                    class="flex size-8 shrink-0 items-center justify-center rounded-lg"
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
                    <UBadge v-if="!tool.route" color="neutral" variant="soft" size="xs"
                      >Soon</UBadge
                    >
                  </span>
                </component>
              </div>
            </Motion>
          </AnimatePresence>
        </div>

        <div class="border-default flex items-center gap-1 border-t pt-2.5">
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
