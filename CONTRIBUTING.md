# Contributing to Ono Toolkit

Thanks for your interest in contributing! Ono Toolkit is a collection of small,
fast, **client-side-only** tools. This guide covers how to propose changes.

## Ways to contribute

- **Report a bug** - open a [bug report](../../issues/new?template=bug_report.md).
- **Request a tool or feature** - open a
  [feature request](../../issues/new?template=feature_request.md).
- **Send a pull request** - fix a bug, add a tool, or improve docs.

For anything non-trivial, please open an issue first so we can agree on the
approach before you invest time.

## Development setup

```bash
pnpm install
pnpm dev            # http://127.0.0.1:3000
```

Requirements: **Node 24** (`.node-version`) and **pnpm 11**.

## Workflow

1. Branch from `main`: `git switch -c feat/<short-name>` (or `fix/<short-name>`).
2. Make a focused change - one logical thing per PR.
3. Run the full gate locally and make sure it passes:
   ```bash
   pnpm validate      # format:check + lint + typecheck + unit tests + build
   pnpm test:e2e      # end-to-end (Playwright)
   ```
   You can enable a pre-push hook that runs `pnpm validate` automatically:
   ```bash
   git config core.hooksPath scripts/git-hooks
   ```
4. Open a pull request against `main` and fill in the PR template.

## Coding standards

- **TypeScript everywhere - no `any`.** Prefer precise types.
- **No giant components.** Reuse and compose: shared components
  (`app/components/`), composables (`app/composables/`), utilities
  (`app/utils/`), and Pinia stores (`app/stores/`).
- **Use Nuxt UI semantic tokens** (`bg-default`, `text-muted`,
  `text-highlighted`, `border-default`, `text-primary`, ...) so light/dark and
  contrast stay correct. Avoid hard-coded one-off colors.
- **Everything stays client-side.** Never upload user files or data; keep heavy
  work in Web Workers and load WASM lazily.
- **Follow the existing structure** and the
  [Adding a New Tool](README.md#adding-a-new-tool) steps.
- **Add tests**: Vitest unit tests for logic/utilities and a Playwright e2e spec
  for the flow.

## Commit messages

- Use short, imperative subjects: `Add JSON formatter tool`,
  `Fix JWT claims date formatting`.
- [Conventional Commits](https://www.conventionalcommits.org/) prefixes
  (`feat:`, `fix:`, `docs:`, `chore:`) are welcome but not required.

## Pull requests

A good PR:

- Does one thing and keeps the diff focused.
- Passes `pnpm validate` (and `pnpm test:e2e` if it touches UI/flows).
- Updates the tool registry, README, and tests when relevant.
- Describes what changed and how you verified it.

## Code of Conduct

By participating, you agree to uphold our
[Code of Conduct](CODE_OF_CONDUCT.md). Be kind and respectful.

## License

By contributing, you agree that your contributions are licensed under the
project's **[AGPL-3.0](LICENSE)** license.
