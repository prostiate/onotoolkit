# Ono Toolkit

A suite of small, fast, **client-side-only** tools that run entirely in your
browser. Nothing is ever uploaded to a server.

Production: https://onotoolkit.irfankurniawan.com

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

## CI/CD

Continuous integration and deployment run on **Cloudflare Workers Builds**
(Cloudflare's own build system - no GitHub Actions, no payment method needed).
On push to `main`, Cloudflare runs the build command and deploys the Worker.

- **Build command:** `pnpm validate` (format + lint + typecheck + unit tests +
  build) - a failing build does not deploy.
- **Deploy command:** `wrangler deploy`.

Because the build runs inside your Cloudflare account, no API token or secret is
required. See `docs/DEPLOYMENT-guide.md` for the exact dashboard setup.

Run before pushing (local gate; e2e isn't run in Workers Builds):

```bash
pnpm validate
pnpm test:e2e
```

Optionally enable the bundled pre-push hook so `pnpm validate` runs automatically
before every push:

```bash
git config core.hooksPath scripts/git-hooks
```

## Deploy

Trunk-based: `main` is always deployable, and pushing to `main` triggers a
Cloudflare Workers Builds deploy. Manual fallback from your machine:

```bash
pnpm deploy       # nuxt build (SSR) then wrangler deploy
```

## Licensing

PDF compression uses [Ghostscript](https://www.ghostscript.com/) (AGPL-3.0),
compiled to WebAssembly. Ono Toolkit is open source, which AGPL permits.

Built by [Muhammad Irfan Kurniawan](https://www.linkedin.com/in/muhammad-irfan-kurniawan).
