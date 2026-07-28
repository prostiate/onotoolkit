# Ono Toolkit

[![CI](https://github.com/prostiate/onotoolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/prostiate/onotoolkit/actions/workflows/ci.yml)

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

## Continuous integration

GitHub Actions (free for public repos) runs on every pull request and push to
`main`:

- **`.github/workflows/ci.yml`** - `pnpm validate` (format, lint, typecheck,
  unit tests, build) and `pnpm test:e2e` (Playwright).

Recommended branch protection on `main`: require the `Validate` check to pass
before merging. Work on short-lived branches and open PRs (trunk-based); `main`
stays always-deployable.

## Deploy

Trunk-based: `main` is always deployable. A release is a version tag.

Automated (recommended) - **`.github/workflows/deploy.yml`** deploys to
Cloudflare when a `v*` tag is pushed:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Add these repository secrets (Settings -> Secrets and variables -> Actions):

- `CLOUDFLARE_API_TOKEN` - create from the **"Edit Cloudflare Workers"** token
  template, scoped to this account and the `irfankurniawan.com` zone (grants
  Workers Scripts edit + Workers Routes edit for the custom domain).
- `CLOUDFLARE_ACCOUNT_ID` - your Cloudflare account ID.

Manual fallback (deploys from your machine using your `wrangler login`):

```bash
pnpm deploy       # nuxt build (SSR) then wrangler deploy
```

## Licensing

PDF compression uses [Ghostscript](https://www.ghostscript.com/) (AGPL-3.0),
compiled to WebAssembly. Ono Toolkit is open source, which AGPL permits.

Built by [Muhammad Irfan Kurniawan](https://www.linkedin.com/in/muhammad-irfan-kurniawan).
