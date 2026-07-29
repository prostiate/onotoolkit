<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="flex-1 px-4 py-8 sm:py-12">
      <slot />
    </main>
    <AppFooter />
    <ConsentPopup />
  </div>
</template>
