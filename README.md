# Ono Toolkit

A suite of small, fast, **client-side-only** tools that run entirely in your
browser. Nothing is ever uploaded to a server.

Production: https://toolkit.irfankurniawan.com

## Tools

| Tool             | Category  | Status      |
| ---------------- | --------- | ----------- |
| Compress PDF     | PDF       | Available   |
| Merge PDF        | PDF       | Coming soon |
| Split PDF        | PDF       | Coming soon |
| Rotate PDF       | PDF       | Coming soon |
| JWT Decoder      | Developer | Coming soon |
| JSON Formatter   | Developer | Coming soon |
| Markdown Preview | Text      | Coming soon |

## Stack

- Nuxt 4 (SSR, Nitro Cloudflare Worker) + Nuxt UI + Pinia + Zod + `motion-v`.
- Heavy work runs in a Web Worker; Ghostscript (compiled to WebAssembly) powers
  PDF compression and is loaded lazily on the client only.
- Deployed to Cloudflare as an SSR Worker with a static assets binding.

## Develop

```bash
pnpm install
pnpm dev
```

## Verify

```bash
pnpm validate     # format + lint + typecheck + unit tests + build
pnpm test:e2e     # Playwright: real in-browser compression + dark mode
```

## Deploy

```bash
pnpm deploy       # nuxt build (SSR) then wrangler deploy
```

## Licensing

PDF compression uses [Ghostscript](https://www.ghostscript.com/) (AGPL-3.0),
compiled to WebAssembly. Ono Toolkit is open source, which AGPL permits.

Built by [Muhammad Irfan Kurniawan](https://www.linkedin.com/in/muhammad-irfan-kurniawan).
