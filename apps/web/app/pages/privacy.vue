<script setup lang="ts">
useSeoMeta({
  title: "Privacy - Ono Toolkit",
  description:
    "Ono Toolkit is private by design: everything runs in your browser, nothing is uploaded, and no accounts or tracking are involved."
});

const sections = [
  {
    icon: "i-lucide-lock",
    title: "Your files never leave your device",
    body: "Every tool runs entirely in your browser using WebAssembly and Web Workers. Files you open are processed locally and are never uploaded to, or seen by, any server."
  },
  {
    icon: "i-lucide-user-x",
    title: "No accounts, no tracking",
    body: "There is no sign-up and no login. Ono Toolkit uses no analytics, no advertising, and no third-party tracking cookies. We do not collect personal data."
  },
  {
    icon: "i-lucide-database",
    title: "What is stored locally",
    body: "Only preferences are kept in your browser, in localStorage, so the site remembers them: your theme preference (light or dark) and the Screen Recorder's pre-recording choices (webcam, microphone, system audio, overlay position and size, and quality). They stay on your device and are never sent anywhere. Recordings and files are never written to localStorage. You can clear everything anytime via your browser."
  },
  {
    icon: "i-lucide-box",
    title: "Third-party code",
    body: "PDF compression is powered by Ghostscript compiled to WebAssembly. It is served from this site and runs locally in your browser - it makes no network calls with your files."
  },
  {
    icon: "i-lucide-shield-alert",
    title: "No warranty",
    body: "Ono Toolkit is free, open-source software provided “as is” under the AGPL-3.0 license, without warranty of any kind. Always keep your own copy of important files."
  }
];
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <div>
      <UButton
        to="/"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        class="mb-4"
      >
        Back to tools
      </UButton>
      <h1 class="text-highlighted text-2xl font-bold">Privacy</h1>
      <p class="text-muted text-sm">
        Ono Toolkit is private by design. Here is exactly what that means.
      </p>
    </div>

    <div class="space-y-3">
      <div
        v-for="section in sections"
        :key="section.title"
        class="border-default bg-default flex gap-3 rounded-xl border p-4 shadow-sm"
      >
        <span
          class="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        >
          <UIcon :name="section.icon" class="size-5" />
        </span>
        <div class="space-y-1">
          <h2 class="text-highlighted font-semibold">{{ section.title }}</h2>
          <p class="text-muted text-sm leading-relaxed">{{ section.body }}</p>
        </div>
      </div>
    </div>

    <p class="text-dimmed text-center text-xs">
      Questions or the full source are on
      <a
        href="https://github.com/prostiate/onotoolkit"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary font-medium hover:underline"
      >
        GitHub </a
      >. Last updated 12 August 2026.
    </p>
  </div>
</template>
