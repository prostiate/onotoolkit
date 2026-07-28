# Ono PDF - developer task runner.
# Thin wrappers around the pnpm scripts so common flows are one command.

.DEFAULT_GOAL := help
.PHONY: help install dev build preview test test-e2e e2e-install \
        validate format format-check lint typecheck deploy clean

help: ## Show this help
	@echo "Ono PDF - available targets:"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	pnpm install

dev: ## Run the dev server (http://127.0.0.1:3000)
	pnpm dev

build: ## Build the static site to apps/web/.output/public
	pnpm build

preview: build ## Build then serve the production output locally
	pnpm --dir apps/web run preview

test: ## Run unit tests (Vitest, includes the real Ghostscript-WASM test)
	pnpm test

e2e-install: ## Install the Playwright Chromium browser
	pnpm exec playwright install chromium

test-e2e: ## Run end-to-end tests (desktop + mobile)
	pnpm test:e2e

format: ## Format all files with Prettier
	pnpm format

format-check: ## Check formatting without writing
	pnpm format:check

lint: ## Lint with ESLint
	pnpm lint

typecheck: ## Type-check the app
	pnpm typecheck

validate: ## Full gate: format:check + lint + typecheck + unit tests + build
	pnpm validate

deploy: ## Build and deploy to Cloudflare (onopdf.irfankurniawan.com)
	pnpm deploy

clean: ## Remove build artifacts and caches
	rm -rf apps/web/.output apps/web/.nuxt node_modules/.cache/nuxt \
		test-results playwright-report tests/e2e/.fixtures
