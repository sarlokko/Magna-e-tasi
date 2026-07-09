# AGENTS.md

## Cursor Cloud specific instructions

**What this is:** `magna-e-tasi` is a single static web app / PWA (vanilla HTML/CSS/JS, no framework, no backend, no database, no build step). All app code lives in `public/`, and recipe data is a static file at `public/data/recipes.json`.

**Services:** There is exactly one service — a static file server for `public/`. Run it with `npm run serve` (see `package.json`), which serves the app at http://localhost:3001.

**Dependencies:** There are no declared npm dependencies and no lockfile. `npm run serve` invokes `npx --yes serve`, so no `npm install` is needed. The startup update script pre-warms the `serve` package in the npx cache; the first `npm run serve` after that starts without downloading.

**Lint / test / build:** None are configured (no ESLint/Prettier, no test framework, no bundler). Deployment (`.github/workflows/deploy.yml`) just uploads `public/` to GitHub Pages as-is — there is nothing to build locally.

**Non-obvious caveats:**
- Open the app via the server (`http://localhost:3001`), not via `file://` — `public/js/app.js` uses `fetch("data/recipes.json")`, which fails on the `file://` protocol.
- Full functionality (YouTube video embeds/thumbnails, Google Fonts) needs internet access. Without it, layout still renders but videos and custom fonts will not load.
- Editing files under `public/` requires only a browser refresh; there is no hot-reload/watch process.
