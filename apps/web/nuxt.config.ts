/** Minimal shape of the Rollup `generateBundle` plugin hook we rely on. */
interface BundleDropPlugin {
  name: string;
  generateBundle(options: unknown, bundle: Record<string, unknown>): void;
}

/**
 * onnxruntime-web references its `.wasm` binaries via `new URL(..., import.meta.url)`,
 * so Vite copies them into `.output/public` - and the WebGPU build's wasm is
 * 25.6MB, over Cloudflare's 25MiB per-asset limit (deploy would fail). We load
 * the runtime from a versioned CDN (see `ort.env.wasm.wasmPaths` in useInpaint),
 * so these local copies are unused: drop them from the emitted bundle.
 */
function dropOnnxWasm(): BundleDropPlugin {
  return {
    name: "ono-drop-onnx-wasm",
    generateBundle(_options, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (fileName.includes("ort-wasm") && fileName.endsWith(".wasm")) {
          Reflect.deleteProperty(bundle, fileName);
        }
      }
    }
  };
}

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
        { name: "theme-color", content: "#0891b2" },
        // Open Graph / Twitter (link previews)
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Ono Toolkit" },
        { property: "og:title", content: "Ono Toolkit - your private, in-browser toolkit" },
        {
          property: "og:description",
          content:
            "Fast developer and PDF tools that run entirely on your device - nothing is uploaded."
        },
        { property: "og:url", content: "https://onotoolkit.irfankurniawan.com" },
        { property: "og:image", content: "https://onotoolkit.irfankurniawan.com/og-image.png" },
        { property: "og:image:width", content: "1280" },
        { property: "og:image:height", content: "640" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Ono Toolkit - your private, in-browser toolkit" },
        {
          name: "twitter:description",
          content:
            "Fast developer and PDF tools that run entirely on your device - nothing is uploaded."
        },
        { name: "twitter:image", content: "https://onotoolkit.irfankurniawan.com/og-image.png" }
      ],
      link: [{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" }]
    }
  },
  vite: {
    worker: {
      format: "es"
    },
    // Heavy, browser-only ML libs are dynamically imported on the client only.
    // Keep them out of Vite's dev dep pre-bundle; at build time they become lazy
    // client chunks (and unused lazy server chunks, like the other browser libs).
    optimizeDeps: {
      exclude: ["onnxruntime-web", "@imgly/background-removal"]
    },
    plugins: [dropOnnxWasm()]
  }
});
