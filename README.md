<div align="center">

<a href="https://onotoolkit.irfankurniawan.com">
  <img src="apps/web/public/og-image.png" alt="Ono Toolkit — your private, in-browser toolkit" width="840" />
</a>

# Ono Toolkit

**A suite of small, fast, privacy-first tools that run entirely in your browser.**
Your files and data never leave your device - no uploads, no accounts, no tracking.

[**Live → onotoolkit.irfankurniawan.com**](https://onotoolkit.irfankurniawan.com)

</div>

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Adding a New Tool](#adding-a-new-tool)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

## Features

Everything runs client-side. Files, tokens, and secrets are processed locally
and are never sent to a server.

### PDF

- **Compress PDF** - shrink PDFs with adjustable quality (Ghostscript-WASM), with
  a before/after page preview slider.
- **Merge / Split / Rotate PDF** - reorder and combine, extract page ranges (one
  PDF or a ZIP), and rotate pages, on a shared page organizer ([pdf-lib](https://pdf-lib.js.org/)).
- **JPG to PDF** / **PDF to JPG** - combine images into a PDF, or turn pages into
  images (single file or ZIP).
- **HTML to PDF** / **Word to PDF** - render pasted/uploaded HTML or a DOCX to PDF.
- **PDF to Markdown** / **PDF to Word** - extract a PDF to editable Markdown or a
  DOCX (best-effort).

### Image

- **Background Remover** - erase an image background or swap in a solid colour,
  powered by [@imgly/background-removal](https://github.com/imgly/background-removal-js)
  running its ONNX model entirely in the browser; exports a lossless PNG.
- **Watermark Remover** - brush over a watermark and inpaint it away with
  [MI-GAN](https://github.com/Picsart-AI-Research/MI-GAN) via
  [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/) (WebGPU → WASM).
  Only the painted pixels are regenerated; every other pixel stays byte-identical.
- **Compress Images** - batch-compress JPG, PNG, and WebP with
  [jSquash](https://github.com/jamsinclair/jSquash) (MozJPEG, oxipng, WebP).
  Choose the output format, keep PNG transparency (lossless oxipng or WebP) or
  flatten it to a colour, preview before/after, and download individually or as a ZIP.

### Developer

- **JWT Debugger** (RFC 7519) - **Decoder** and **Encoder** tabs powered by
  [jose](https://github.com/panva/jose): a colored token editor, decoded
  header/payload with JSON highlighting, a claims breakdown with expiry state,
  optional **signature verification** and **signing/generation** across
  HS/RS/PS/ES/EdDSA (HMAC secret with a Base64URL switch, or a PEM/JWK key), and
  a "Generate example" that even mints key pairs in the browser.
- **JSON Formatter** - side-by-side [CodeMirror](https://codemirror.net/) editors
  with inline validation: pretty-print with a 2/3/4-space or tab indent, minify,
  recursively sort keys, and convert JSON to **YAML**, **CSV**, or **XML**
  ([yaml](https://github.com/eemeli/yaml),
  [json-2-csv](https://github.com/mrodrig/json-2-csv),
  [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)), with
  upload, copy on both panes, and download.

### Text & Markdown

- **Markdown Studio** - edit Markdown in a live editor and export to PDF or Word
  (DOCX).

### Media

- **YouTube Downloader** - save a video as combined video + audio (MP4) or audio
  only (M4A). See the note below on how this one works.

Plus a considered experience: light/dark themes, mobile-first responsive
layouts, motion.dev micro-interactions (an animated orbiting-planet logo), and a
privacy notice with a first-visit consent popup.

### A note on the YouTube Downloader (the one tool that isn't in-browser)

Every other tool here runs **entirely in your browser** - the blanket
"nothing leaves your device" claim above holds for all of them. YouTube
downloading is the sole exception: browsers can't fetch YouTube's signed video
streams, so this one tool talks to a small backend that runs
[`yt-dlp`](https://github.com/yt-dlp/yt-dlp).

That backend lives in a **separate private repository** - not to hide anything
from you, but for the maintainer's peace of mind (it's a personal, free-tier
service). To be clear about what it does and doesn't do: it is **still
no-tracking and no-accounts**. Only the YouTube link you paste is sent, solely to
fetch the video; **nothing is stored, logged, or retained**, and no personal data
is processed. The link is proxied through this site to the backend (which signs
and authenticates the call) and the video is streamed straight back to you.

## Tech Stack

- **[Nuxt 4](https://nuxt.com/)** (Vue 3, SSR) with **[Nuxt UI](https://ui.nuxt.com/)**
- **[Pinia](https://pinia.vuejs.org/)** for state, **[Zod](https://zod.dev/)** for validation
- **[motion-v](https://motion.dev/docs/vue)** for animation
- **[jose](https://github.com/panva/jose)** (JWT), **[Ghostscript-WASM](https://github.com/jsscheller/ghostscript-wasm)** + **[pdf-lib](https://pdf-lib.js.org/)** + **[pdf.js](https://mozilla.github.io/pdf.js/)** (PDF), **[CodeMirror 6](https://codemirror.net/)** (JSON editor)
- **[@imgly/background-removal](https://github.com/imgly/background-removal-js)** + **[onnxruntime-web](https://onnxruntime.ai/docs/tutorials/web/)** with **[MI-GAN](https://github.com/Picsart-AI-Research/MI-GAN)** (in-browser image AI), **[jSquash](https://github.com/jamsinclair/jSquash)** (MozJPEG/oxipng/WebP image compression)
- Heavy work runs in **Web Workers**; WASM is loaded lazily, client-side only.
- **TypeScript** throughout (no `any`), **ESLint** + **Prettier**, **Vitest** + **Playwright**.

## Getting Started

### Prerequisites

- **Node 24** (see `.node-version`)
- **pnpm 11** (`corepack enable` will provide it)

### Install & run

```bash
pnpm install
pnpm dev            # http://127.0.0.1:3000
```

### Production preview

```bash
pnpm build          # static + SSR build
pnpm --dir apps/web run preview
```

## Project Structure

```
onotoolkit/
  apps/web/                 # the Nuxt app
    app/
      components/           # layout/, tool/, ui/ (reusable, no giant components)
      composables/          # useGhostscript, usePdfRender, useJwt, useFileDownload
      pages/                # index.vue + tools/*.vue + privacy.vue
      stores/               # Pinia stores (one per tool)
      tools/registry.ts     # single source of truth for the tool catalog
      types/ utils/ schemas/ workers/
    tests/                  # Vitest unit + engine tests
  tests/e2e/                # Playwright end-to-end tests
  wrangler.jsonc            # Cloudflare Worker config
```

## Adding a New Tool

The tool catalog is driven by one registry, so adding a tool is small and
self-contained:

1. Add an entry to `apps/web/app/tools/registry.ts` (slug, title, description,
   icon, group, `status`, `route`). It appears on the landing page
   automatically.
2. Create `apps/web/app/pages/tools/<name>.vue` using the shared `ToolLayout`
   and UI components (`AppCard`, and helpers like `JsonHighlight`).
3. Put logic in a composable (`app/composables/`) and state in a Pinia store
   (`app/stores/`); keep pure, testable helpers in `app/utils/`.
4. Add Vitest unit tests and a Playwright e2e spec.

## Testing

```bash
pnpm validate       # format:check + lint + typecheck + unit tests + build
pnpm test           # unit tests (Vitest), incl. real Ghostscript + jose checks
pnpm test:e2e       # end-to-end (Playwright), desktop + mobile
```

Please make sure `pnpm validate` passes before opening a pull request.

## Contributing

Contributions are welcome! Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** for
the workflow, coding standards, and how to open issues and pull requests. In
short: open an issue to discuss, branch from `main`, keep changes focused, run
`pnpm validate`, and open a PR.

## License

Licensed under **[AGPL-3.0](LICENSE)**. This is required because Ono Toolkit
bundles and serves **Ghostscript** (AGPL-3.0) for PDF compression - and
**[@imgly/background-removal](https://github.com/imgly/background-removal-js)**
(AGPL-3.0) for background removal - so the whole distributed app must remain
open-source under AGPL. If you fork or self-host a modified version, you must
also make your source available to your users.

## Acknowledgements

A huge thank-you to the open-source projects that make the in-browser image
tools possible - all AI runs on-device, nothing is uploaded:

- **[@imgly/background-removal](https://github.com/imgly/background-removal-js)**
  by [IMG.LY](https://img.ly/) - browser background removal (AGPL-3.0).
- **[MI-GAN](https://github.com/Picsart-AI-Research/MI-GAN)** by Picsart AI
  Research (ICCV 2023) - the inpainting model used for watermark removal (MIT),
  with the ONNX weights hosted on
  [Hugging Face](https://huggingface.co/andraniksargsyan/migan).
- **[ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)** by Microsoft
  - in-browser model inference (MIT).
- **[lxfater/inpaint-web](https://github.com/lxfater/inpaint-web)** - reference
  for the MI-GAN browser I/O contract.
- **[jSquash](https://github.com/jamsinclair/jSquash)** by Jamie Sinclair - the
  Squoosh WebAssembly codecs (MozJPEG, oxipng, WebP) that power image
  compression, entirely in the browser (MIT).

## Author

Built by **[Muhammad Irfan Kurniawan](https://www.linkedin.com/in/muhammad-irfan-kurniawan)**.
