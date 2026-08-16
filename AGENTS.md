# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Add durable project-specific notes here as they are discovered through real work.

## Checks

`pnpm validate` runs the full gate (format:check, lint, typecheck, test, build). Browser E2E
(`pnpm test:e2e`) needs a real Chrome and does not run in headless agent sandboxes.

## First-run download budgets

Several tools stream a model or wasm payload on first use. These are the only real network
fetches in the app - everything else is client-side, and no user data ever leaves the browser.
Quote a size in the UI _before_ the download starts, and keep the number in code next to the
thing it measures (see `apps/web/app/schemas/backgroundRemover.ts`) so it cannot go stale:

- Background remover - `@imgly/background-removal` asset CDN. Its own default is `medium`
  (`isnet_fp16`, 88 MB); we always pass an explicit model. `isnet_quint8` 44,348,940 B,
  `isnet_fp16` 88,152,708 B, plus a shared 11,845,354 B ONNX runtime (CPU/wasm backend).
- Watermark remover - MI-GAN from Hugging Face, 28,079,181 B, plus onnxruntime-web wasm
  from jsDelivr (11,819,815 B).
- PDF compress/merge - `@jspawn/ghostscript-wasm` `gs.wasm`, 16,177,271 B, served same-origin.

## Per-tool settings

Preferences that should survive a reload live in the tool's Pinia store behind a zod schema in
`apps/web/app/schemas/`, persisted to `localStorage` under an `ono-toolkit-*` key with
`hydrate()`/persist actions that swallow storage errors (private mode). `stores/screenRecorder.ts`
is the fullest example; `stores/backgroundRemover.ts` is the minimal one.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
