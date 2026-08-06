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
  runtimeConfig: {
    // Server-only secrets for the YouTube Downloader backend proxy. These are
    // NOT under `public`, so they never reach the browser. The Nitro routes in
    // server/api/yt/* read these to sign and forward requests to Render.
    //   NUXT_YT_BACKEND_URL   - the private Render service URL
    //   NUXT_YT_API_KEY       - shared secret (matches backend YT_API_KEY)
    //   NUXT_YT_HMAC_SECRET   - HMAC secret (matches backend YT_HMAC_SECRET)
    ytBackendUrl: "",
    ytApiKey: "",
    ytHmacSecret: "",
    // Abuse controls (all optional; each layer activates only when configured).
    //   NUXT_TURNSTILE_SECRET   - Cloudflare Turnstile secret (server-side verify)
    //   NUXT_YT_ALLOWED_ORIGIN  - only accept proxy calls from this Origin
    //   NUXT_YT_DAILY_GLOBAL_MAX / NUXT_YT_DAILY_IP_MAX - KV-backed daily download caps
    turnstileSecret: "",
    ytAllowedOrigin: "",
    ytDailyGlobalMax: "",
    ytDailyIpMax: "",
    public: {
      // Turnstile site key is meant to be public (rendered in the browser widget).
      //   NUXT_PUBLIC_TURNSTILE_SITE_KEY
      turnstileSiteKey: ""
    }
  },
  // Only build for the Cloudflare Worker in production. Local `nuxt dev` then
  // uses the standard (lighter) dev server instead of Cloudflare emulation.
  $production: {
    nitro: {
      preset: "cloudflare_module"
    }
  },
  nitro: {
    // Cloudflare Workers support modern JS; pin esbuild to es2022 so BigInt
    // literals in dependencies (e.g. Nuxt UI's useFieldGroup) aren't flagged as
    // unsupported for the default es2019 target during the Worker build.
    esbuild: {
      options: {
        target: "es2022"
      }
    }
  },
  colorMode: {
    preference: "light",
    fallback: "light",
    classSuffix: "",
    storageKey: "ono-toolkit-color-mode"
  },
  // Source maps for the heavy client-only ML/codec chunks roughly double build
  // memory and are unnecessary in production - disabling them keeps the Nitro
  // Cloudflare build within the build container's memory limit.
  sourcemap: false,
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
      exclude: [
        "onnxruntime-web",
        "@imgly/background-removal",
        "@jsquash/jpeg",
        "@jsquash/webp",
        "@jsquash/oxipng",
        "konva"
      ]
    },
    plugins: [dropOnnxWasm()]
  }
});
