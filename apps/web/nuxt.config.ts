export default defineNuxtConfig({
  compatibilityDate: "2026-07-28",
  ssr: true,
  modules: ["@nuxt/ui", "@pinia/nuxt", "@nuxt/eslint", "motion-v/nuxt"],
  components: [{ path: "~/components", pathPrefix: false }],
  css: ["~/assets/css/main.css"],
  // Only build for the Cloudflare Worker in production. Local `nuxt dev` then
  // uses the standard (lighter) dev server instead of Cloudflare emulation.
  $production: {
    nitro: {
      preset: "cloudflare_module"
    }
  },
  colorMode: {
    preference: "light",
    fallback: "light",
    classSuffix: "",
    storageKey: "ono-toolkit-color-mode"
  },
  app: {
    head: {
      title: "Ono Toolkit",
      titleTemplate: "%s",
      htmlAttrs: { lang: "en" },
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Ono Toolkit is a suite of fast, private, in-browser tools. Your files never leave your device."
        },
        { name: "theme-color", content: "#0891b2" }
      ],
      link: [{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }]
    }
  },
  vite: {
    worker: {
      format: "es"
    }
  }
});
