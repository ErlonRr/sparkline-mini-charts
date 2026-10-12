# Contributing

Thanks for helping improve `sparkline-mini-charts`.

## Where the project lives

- **GitHub is canonical:** [github.com/ErlonRr/sparkline-mini-charts](https://github.com/ErlonRr/sparkline-mini-charts). Open issues and pull requests there. Its CI (`.github/workflows/ci.yml`) is the source of truth for whether a change can merge.
- **Forgejo is a mirror.** Its workflow (`.forgejo/workflows/ci.yaml`) runs a subset of the GitHub checks on every push: the same steps up to "Build demo", on Node 22 only, without the Playwright browser tests (`pnpm test:e2e`). It does not gate anything and deploys nothing. Don't open pull requests on the mirror.
- **Vercel hosts the demo.** It builds a preview of every pull request and deploys `main` to production with the settings in `vercel.json` (`pnpm build && pnpm build:demo`, output `dist-demo/`). `main` only receives pull requests whose CI passed, so production only gets checked code.
- **npm releases come from GitHub Actions** (`.github/workflows/release.yml`); see "Releasing" below.

## Prerequisites

- Node.js 22.15 or newer (CI runs the latest Node 22 and 24). Older Node.js 22 releases lack `module.registerHooks()`: the lifecycle checks (c) and (d) and the React 18.3 suite are skipped locally and fail on CI. The published package itself still supports every Node.js 22.
- pnpm 11, at the exact version pinned in the `packageManager` field of `package.json`.

## Running the checks

Run them in the same order as CI:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint:source    # scripts/check-source.mjs: forbidden patterns in src/ (see "Source checks" below)
pnpm lint:docs      # scripts/check-docs.mjs: docs and demo against src/ (see "Docs checks" below)
pnpm test:unit      # tests against src/, no build needed (`pnpm test` is an alias)
pnpm build          # vite build, then scripts/emit-entry-dts.mjs writes the per-entry .d.ts stubs and the .d.cts copies
pnpm api:check      # the public API of every entry against api/*.api.md (see "API reports" below)
pnpm lint:package   # publint + attw on the packed tarball (see "Package lint" below)
pnpm test:package   # tests against the built dist/, so it needs `pnpm build` first
pnpm build:demo
pnpm test:e2e       # Playwright on `vite preview` of dist-demo/, so it needs `pnpm build && pnpm build:demo` first
```

Tests use the built-in `node:test` runner:

- `test/**/*.test.js` are unit tests. They import from `src/` and must pass on a clean clone with no `dist/`.
- `test/package-*.test.js` check the built artefacts in `dist/`. `test:unit` skips them, and `test:package` runs only them.
- `test/contract/` is the lifecycle contract suite. It runs every tag registered by `src/define.js` through [happy-dom](https://github.com/capricorn86/happy-dom). Every check (a)-(g) must pass on every tag: there is no list of known failures and no TODO test. Next to it, `data.test.js` covers the `data` property, the per-chart parsers and the render error boundary, and `styles.test.js` statically checks the shared stylesheet (reduced motion may only change timing, never data geometry).
- `test/package-react.test.js`, `test/package-react-18.test.js` and `test/package-vue.test.js` mount the built `dist/react.js` and `dist/vue.js` wrappers in happy-dom and server-render them in a child process. The shared cases live in `test/adapters/` (helpers there are not named `*.test.js`, so neither script picks them up on its own). The React 18.3 run uses the `react-18`/`react-dom-18` npm aliases from `devDependencies`, and `test/adapters/react-18.js` redirects every `react`/`react-dom` import to them with `module.registerHooks()`, so the same dist file runs on both majors.
- `test/docs-snippets.test.js` statically checks the framework snippets in `README.md`, `docs/` and the demo (`demo/index.html` tabs, the `demo/app.js` catalog): no `JSON.stringify(` (bind `data` as a property instead), no HTML comments inside JSX, and Angular snippets use the AOT-safe recipe.
- `test/check-docs.test.js` runs `scripts/check-docs.mjs` on the repository (see "Docs checks" below) and unit-tests the check itself on small fixtures.
- `test/package-types.test.js` type-checks `test/types/entries.ts`, which imports all 24 entries by package name (the root entries, every component subpath, `./math`, `./react`, `./vue` and `./angular`), with `tsc` under `moduleResolution` `node16` and `bundler` (configs in `test/types/`). Under `node16` it also checks `test/types/entries.cts`, a CommonJS file that imports the same 24 entries through their `require` condition: if one of them resolved to ESM declarations, or if the Angular `.d.cts` imported `@angular/core` without `resolution-mode: "import"`, `tsc` would reject it. TypeScript 7 has no `node10` resolution, so that mode is covered by attw (see "Package lint"). TypeScript resolves the names through the package's own `exports`, so it checks `dist/` as published.
- `test/release-changelog.test.js` checks the Changesets changelog generator and `scripts/release-changelog.mjs` (see "Releasing" below): the release rewrite and the `--notes` extraction, also on the real `CHANGELOG.md` and the pending changesets.
- `test/emit-entry-dts.test.js` checks the `.d.cts` rewrite of `scripts/emit-entry-dts.mjs` (relative `.cjs` specifiers, `resolution-mode` on every import and re-export form of `@angular/core`).
- `test/check-source.test.js` runs `scripts/check-source.mjs` on `src/` and unit-tests its rules and comment scanner (see "Source checks" below).
- `test/e2e/*.spec.ts` are the demo browser tests, run by `pnpm test:e2e` with [Playwright](https://playwright.dev/) (Chromium) against `vite preview` of the built demo; `test:unit` does not run them. `demo-smoke.spec.ts` opens the 8 views and checks a clean console, the 17 tags defined and a rendered chart, plus the fixed flows (tabs, playground, theming presets, copy errors, unknown chart route, blocked storage). `demo-a11y.spec.ts` runs axe (`@axe-core/playwright`, no serious or critical violation on the 8 views in light and dark), checks no horizontal scroll at 320 and 375 px, the mobile drawer focus, that nothing streams with reduced motion or in a hidden tab, and `html[lang]`. The first run needs `pnpm exec playwright install chromium`.
- `test/package-angular.test.js` loads `@angular/compiler` (JIT) and renders `dist/angular.js` with TestBed in happy-dom: `MiniChartDirective` registration, inputs and outputs, the AOT-safe raw-element recipe, the documented limitation of the signal directives, and, by setting their input signals directly, that the signal directives write `"false"` for the options that are on by default (`hollow-bullish`, `round-caps`, `shared-domain`). A real AOT build is not part of the suite.

## Source checks

`pnpm lint:source` runs `scripts/check-source.mjs` on every file in `src/` and fails on:

- `this.style` (any access: `this.style.x`, `this.style = …`, `this.style[…]`), `this.attributeStyleMap`, and `this.setAttribute("style", …)` (or `removeAttribute`, `toggleAttribute`, the `NS` variants) — a chart never writes its host's inline style, which belongs to the page and to framework bindings. Chart state goes on internal nodes (for example `data-trend` on the svg) and the shadow stylesheet maps it.
- `innerHTML`, `outerHTML`, `insertAdjacentHTML` — HTML string sinks throw under a Trusted Types CSP. Clear with `replaceChildren()` and build nodes.
- `var(--…)` and `getPropertyValue("--…")` without the `--mini-` prefix (private `--_mc-` variables excepted) — custom properties inherit into the shadow root, so an app-level name such as `--primary` would restyle the chart.

Comments are ignored, so documentation can name a forbidden pattern. A small scanner finds them: comment markers inside strings, template literals (where the CSS lives) and regular expressions are not comments, so a `"/*"` in a string cannot hide the code after it. `test/check-source.test.js` runs the same check, so `pnpm test:unit` fails too.

## Docs checks

`pnpm lint:docs` runs `scripts/check-docs.mjs`, which compares `README.md`, every page under `docs/`, `demo/index.html` and `demo/app.js` with `src/` in both directions:

- Docs and demo → src: every `--mini-*` custom property they mention is read with `var()` somewhere in `src/`; every `::part(…)` (and, in Markdown, every `part="…"`) exists, on the named tag when the selector names one; every `<mini-…>` tag exists, and every attribute written on it is in that tag's `observedAttributes`. That covers Angular `[x]` / `[attr.x]`, Vue `:x` and Svelte `x={…}` bindings; the React and Vue wrappers (`<MiniLineChart trendColor="auto">`, whose camelCase props map to kebab-case attributes); the demo catalog's `attrs`, `reactProps`, `vueProps` and `angularProps`; and `setAttribute("x", …)` in a script when the receiver is a chart (`document.querySelector("mini-…")`, `getElementById()` of a chart's `id` in the pages, `createElement()` of a chart, or a variable assigned one of those). Global attributes (`id`, `class`, `style`, `aria-*`, `data-*`, …) are ignored.
- Events: a chart event used in docs or demo, by `addEventListener("…")`, Angular `(x)`, Vue `@x`, Svelte `on:x` or a React event prop (`onSparklineHover`, mapped through the wrapper's event map in `src/react/index.ts`), must be dispatched by that chart (by any chart when the receiver is unknown). DOM event types have no dash, so only dashed names are checked, and `onClick`-style React props are left alone.
- src → docs: `docs/components/<tag>.md` has the tables `## Attributes`, `## Events`, `## CSS custom properties` and `## Parts`, with the names in backticks in the first column. Each table lists every observed attribute, dispatched event, `var(--mini-…)` read by the chart's own source and part the chart sets, and nothing the chart does not have (the shared tokens and the `svg` part of `src/core/svg.js` may be listed on any chart). The shared tokens of `src/core/svg.js` must appear by their exact name, in backticks, in a docs table (`docs/getting-started.md`, "Theming tokens"); `--mini-chart-color-N` does not count for `--mini-chart-color`.

A template expression in a name (`--mini-chart-color-${i}`, `segment-${i}`) is matched by a documented placeholder such as `--mini-chart-color-N` or `segment-N`. `CHANGELOG.md` is history and is not checked. `test/check-docs.test.js` runs the same check, so `pnpm test:unit` fails on drift too.

## Package lint

`pnpm lint:package` runs [publint](https://publint.dev) and [`attw --pack`](https://github.com/arethetypeswrong/arethetypeswrong.github.io) ("Are the types wrong?") on the tarball `npm pack` would publish. Packing runs the `prepack` script, so it rebuilds `dist/` first. Both CI workflows run it after the build. Errors fail the step.

Every export has nested conditions, `import: { types, default }` and `require: { types, default }`. The `require` side points at a `.d.cts` copy of the ESM declarations, written by `scripts/emit-entry-dts.mjs` (relative `.js` specifiers become `.cjs`, and type imports of the ESM-only `@angular/core` carry `resolution-mode: "import"`), so a TypeScript project that `require()`s the CommonJS build gets CommonJS types.

attw checks all four resolution modes (`node10`, `node16` from CommonJS, `node16` from ESM, `bundler`) for all 24 entries, with no allowlist and no `--profile`. `node10` (`moduleResolution: "node"`) predates `exports`: for it, the `typesVersions` field of `package.json` maps each subpath to its ESM declarations, as `types` does for the root entry. `test/package.test.js` keeps `typesVersions` equal to the `exports` map, and `scripts/emit-entry-dts.mjs` fails the build if one of its paths has no file. Any attw problem, such as "masquerading as ESM" (`false-esm`) or "resolution failed" (`no-resolution`), fails the step, and publint must report no warnings.

## API reports

`api/` holds one [API Extractor](https://api-extractor.com/) report per entry of the `exports` map: `api/sparkline-mini-charts.api.md` for the main entry and `api/sparkline-mini-charts.<subpath>.api.md` for the others (`react`, `vue`, `angular`, `math`, `define`, `register` and the 17 component subpaths). Each report is the TypeScript surface of the built `dist/*.d.ts`, including the members the charts inherit from the base class.

`pnpm api:check` (`scripts/api-report.mjs`, run in CI after the build and by `prepublishOnly`) regenerates the reports from `dist/` and fails with a diff if one differs, if one is missing, or if a report has no entry left. So a pull request that adds, removes or changes an export, a method or a type has to update `api/` too:

```sh
pnpm build
pnpm api:update     # rewrites api/*.api.md
```

Review the diff before committing it: a removed or narrowed line is a breaking change (see "Public API" below). The reports cover the TypeScript surface only; tags, attributes, events, parts and tokens are checked by `pnpm lint:docs` against `docs/components/`.

API Extractor analyses the declarations with its bundled TypeScript 5.x, because the repository's TypeScript 7 has no JavaScript API. It only reads `.d.ts` files, so the version difference does not matter. The React and Vue reports also show types from `react` and `vue`, so upgrading those dev dependencies can change the reports without a change in this package; update them in the same pull request.

## Public API

In 1.x, the public API is everything a user can rely on without reading `src/`:

- **tags**: the 17 `mini-*-chart` custom element names;
- **attributes**: every name in a chart's `observedAttributes`, with its accepted values and defaults;
- **properties**: `data`, `label` and the other properties of the elements, and the props of the React, Vue and Angular wrappers;
- **events**: the event types the charts dispatch, and the keys of each event's `detail`;
- **parts**: the names exposed to `::part()`;
- **tokens**: the `--mini-*` custom properties the charts read;
- **exports**: every subpath of the `exports` map and every name it exports, with its TypeScript types (`api/*.api.md`).

Each chart's tags, attributes, events, parts and tokens are listed in `docs/components/<tag>.md`, and `pnpm lint:docs` keeps that list equal to `src/`. Anything else (private `--_mc-*` variables, internal nodes and classes, file layout inside `dist/`, the demo) can change in any release.

Semantic versioning applies to that surface:

- **patch**: bug fixes, documentation, widened types, nothing a user has to change;
- **minor**: additions, and deprecations;
- **major**: removals, renames, narrowed types, or a changed meaning of an existing name.

## Deprecation policy

A public name is never removed or renamed in a patch or minor release. To replace one:

1. Add the new name in a minor release and keep the old one working as an alias.
2. In development builds only, the old name logs a single `console.warn` per page (not per element) that names the replacement and the version that removes it (`removeIn`, always a major, for example `"removeIn": "2.0.0"`). Production builds stay silent.
3. List the deprecation under `### Deprecated` in the changeset, with the replacement and `removeIn`, and mark the old name as deprecated in its docs page (and with `@deprecated` in the TypeScript types).
4. Remove it only in the major named by `removeIn`, listed under `### Removed`.

## Changesets

Every pull request that changes what users get from npm (the code in `src/`, the types, the package metadata, `README.md` or the published docs) adds a changeset:

```sh
pnpm changeset
```

Pick `patch`, `minor` or `major` for `sparkline-mini-charts` (see "Public API" above), then replace the summary with [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) sections and user-facing bullets:

```md
---
"sparkline-mini-charts": patch
---

### Fixed

- **Gauge:** the needle no longer overshoots `max` when the value is out of range.
```

Use the sections `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed` and `Security`. A changeset without a section heading is filed under `Changed`. Describe what changes for the user, not how the code changed, and leave out internal work (tests, CI, refactors) unless users notice it.

**The demo is not part of the package**: demo-only changes (`demo/`, `vite.config.demo.js`, `vercel.json`) need no changeset and never appear in `CHANGELOG.md`. A pull request that only touches the demo, tests or CI can skip the changeset; say so in the pull request description.

## Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets) in `.github/workflows/release.yml`, on every push to `main`:

1. While changesets are pending, the `version` job opens or updates a **Version Packages** pull request. It runs `pnpm version-packages`: `changeset version` bumps `package.json` and deletes the consumed changesets, then `scripts/release-changelog.mjs` moves the notes under `## [Unreleased]` and the new changesets into one `## [x.y.z] - date` section of `CHANGELOG.md` (Keep a Changelog sections, merged), updates the compare links, and turns the other `[Unreleased]` references into `[x.y.z]`. Changesets looks for a heading that is exactly `## x.y.z` to fill the pull request body, and would paste the whole `CHANGELOG.md`; the next step replaces the body with the notes of the new version (`node scripts/release-changelog.mjs --notes x.y.z`). Review and edit that pull request like any other.
2. **CI on that pull request.** GitHub starts no workflow for events caused by a job's `GITHUB_TOKEN`, so a Version Packages pull request pushed with it never gets the required `Node 22` / `Node 24` checks and cannot be merged under branch protection. With the GitHub App of "Release setup" configured, the job pushes with an installation token of the app instead, and CI runs as usual. Without it, start CI by hand: close and reopen the pull request (an event caused by a person), then wait for the checks.
3. Merging it starts the `publish` job in the protected `npm` environment. `pnpm release` (`changeset publish`) runs `pnpm publish`, whose `prepublishOnly` (`test:unit`, `build`, `test:package`, `api:check`) and `prepack` (`build`) scripts gate the tarball. There is no npm token: pnpm exchanges the job's GitHub OIDC token through npm [trusted publishing](https://docs.npmjs.com/trusted-publishers), and npm attaches a provenance attestation. The action then pushes the `vX.Y.Z` tag. The GitHub release is created by the next step, only when something was published, with `gh release create vX.Y.Z --notes-file …` and the body of the `## [x.y.z]` section (again `--notes`): the action's own release step (`create-github-releases`) is off, because it would use the whole file as the body and fail once that passes GitHub's 64 KiB limit, after npm already has the version.

Only the `publish` job can request an OIDC token (`id-token: write`), and only the `version` job can write pull requests; the workflow itself has no permissions. `publishConfig.provenance` is `true`, so a publish from a laptop fails instead of shipping a tarball without provenance. Check the contents of a tarball with `npm pack --dry-run`.

Notes written by hand under `## [Unreleased]` in `CHANGELOG.md` are kept and released with the next version.

### The first release after 1.4.0 (1.4.1 and 1.4.2)

1.4.1 was never published: the P0 fixes are written by hand under `## [Unreleased]`, and the P1 fixes are pending changesets (all `patch`). The repository owner picks one of two paths before merging to `main`:

- **One combined release (the default of the pipeline).** Merge P0 and P1 together. Changesets bumps 1.4.0 by one patch, so the Version Packages pull request releases the `[Unreleased]` notes and the changesets together as **1.4.1** in one `## [1.4.1]` section, from GitHub Actions with provenance. There is no separate 1.4.2: the next patch after it is 1.4.2.
- **Two releases (1.4.1 by hand, then 1.4.2 from the pipeline).** Commit P0 alone first and publish it as 1.4.1 from that commit, before the P1 changesets reach `main`: set `"version": "1.4.1"` in `package.json`, run `node scripts/release-changelog.mjs` (with no Changesets entry it releases the `[Unreleased]` notes alone as `## [1.4.1]`), commit, then publish from a clean clone. `publishConfig.provenance` is `true`, and a laptop has no OIDC token to sign provenance with, so a plain `pnpm publish` fails: pass `--provenance=false` explicitly (check with `pnpm publish --dry-run --provenance=false` first), push the `v1.4.1` tag and create its GitHub release with `node scripts/release-changelog.mjs --notes 1.4.1`. Then merge P1: the Version Packages pull request bumps 1.4.1 to **1.4.2** with the changesets alone. This 1.4.1 has no provenance attestation; every later version does.

Either way, the compare links in `CHANGELOG.md` start from the `v1.4.0` tag, which must exist on GitHub (it points at the 1.4.0 release commit, `5a9322d`).

## Pull requests

- Branch from `main` and keep each pull request focused on one change.
- Fill in the pull request template, and add a changeset (see "Changesets" above) unless the change is demo-, test- or CI-only.
- CI must be green before merging.
- 1.x releases are semver-stable. A patch or minor release must not break the public API (see "Public API" above).
- Match the surrounding style. `src/core` and `src/components` are plain JavaScript with JSDoc, and every file starts with a `// file.js — description.` header. The framework adapters in `src/react`, `src/vue` and `src/angular` are TypeScript.

## Branch protection (maintainer setup)

The repository owner sets this up once in the GitHub settings, under **Settings → Branches** (or **Rules → Rulesets**), for `main`:

- require a pull request before merging;
- require the `Node 22` and `Node 24` status checks from the CI workflow to pass, and require the branch to be up to date. The checks show up in the picker only after the workflow has run once;
- block force pushes and branch deletion.

## Release setup (maintainer setup)

Done once by the repository owner:

- **GitHub environment:** create the `npm` environment under **Settings → Environments**, restrict its deployment branches to `main`, and optionally require a reviewer, so every publish waits for an approval.
- **GitHub Actions:** under **Settings → Actions → General**, allow GitHub Actions to create and approve pull requests (the Version Packages pull request needs it when it is opened with `GITHUB_TOKEN`).
- **GitHub App for the Version Packages pull request** (recommended; see "Releasing", step 2): under **Settings → Developer settings → GitHub Apps** of the owner's account, create an app with no webhook and only the repository permissions **Contents: Read and write** and **Pull requests: Read and write**. Install it on this repository only. In the repository, under **Settings → Secrets and variables → Actions**, add the app's Client ID as the variable `RELEASE_APP_CLIENT_ID` and one of its private keys (the whole `.pem` file) as the secret `RELEASE_APP_PRIVATE_KEY`. The `version` job uses the app when the variable is set, and falls back to `GITHUB_TOKEN` (with no CI on the pull request) when it is not. Commits on the `changeset-release/main` branch then show the app as their author.
- **npm trusted publisher:** on npmjs.com, in the package settings, add a trusted publisher for GitHub Actions with the repository `ErlonRr/sparkline-mini-charts`, the workflow `release.yml` and the environment `npm`. Then, under publishing access, disallow tokens, so only the workflow can publish.
- **Vercel:** connect the project to the GitHub repository, with `main` as the production branch. Preview deployments for pull requests are on by default. The build settings come from `vercel.json`. Set the environment variable `ENABLE_EXPERIMENTAL_COREPACK=1`, so Vercel installs with the pnpm version pinned in `packageManager`, and point the demo domain (`sparkline-mini-charts.erlonrru.com`) at the Vercel project: the Forgejo workflow no longer deploys it.
- **Vercel Deployment Checks:** in the Vercel project settings, under **Deployment Checks**, add the GitHub checks `Node 22` and `Node 24` of the CI workflow, so a production deployment of `main` is promoted only after CI passes on that commit. Branch protection already keeps unchecked code out of `main`; this also covers a direct push by an admin.
- **`v1.4.0` tag:** 1.4.0 was released without a tag on GitHub. Push `v1.4.0` on the release commit `5a9322d`, so the compare links in `CHANGELOG.md` and the first `[x.y.z]` link the release script writes resolve.
