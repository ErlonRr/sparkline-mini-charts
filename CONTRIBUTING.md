# Contributing

Thanks for helping improve `sparkline-mini-charts`.

## Where the project lives

- **GitHub is canonical:** [github.com/ErlonRr/sparkline-mini-charts](https://github.com/ErlonRr/sparkline-mini-charts). Open issues and pull requests there. Its CI (`.github/workflows/ci.yml`) is the source of truth for whether a change can merge.
- **Forgejo is a mirror.** Its workflow (`.forgejo/workflows/ci.yaml`) runs the same checks and deploys the self-hosted demo, only from `main`. Don't open pull requests on the mirror.

## Prerequisites

- Node.js 22.15 or newer (CI runs the latest Node 22 and 24). Older Node.js 22 releases lack `module.registerHooks()`: the lifecycle checks (c) and (d) and the React 18.3 suite are skipped locally and fail on CI. The published package itself still supports every Node.js 22.
- pnpm 11, at the exact version pinned in the `packageManager` field of `package.json`.

## Running the checks

Run them in the same order as CI:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:unit      # tests against src/, no build needed (`pnpm test` is an alias)
pnpm build          # vite build, then scripts/emit-entry-dts.mjs writes the per-entry .d.ts stubs
pnpm lint:package   # publint + attw on the packed tarball (see "Package lint" below)
pnpm test:package   # tests against the built dist/, so it needs `pnpm build` first
pnpm build:demo
```

Tests use the built-in `node:test` runner:

- `test/**/*.test.js` are unit tests. They import from `src/` and must pass on a clean clone with no `dist/`.
- `test/package-*.test.js` check the built artefacts in `dist/`. `test:unit` skips them, and `test:package` runs only them.
- `test/contract/` is the lifecycle contract suite. It runs every tag registered by `src/define.js` through [happy-dom](https://github.com/capricorn86/happy-dom). Tag/check pairs that still fail on the current code are listed in `knownFailures` in `lifecycle.test.js` and reported as TODO. Remove an entry in the change that fixes it. `LIFECYCLE_STRICT=1 pnpm test:unit` ignores the list and runs every pair as a real test. Next to it, `data.test.js` covers the `data` property, the per-chart parsers and the render error boundary, and `styles.test.js` statically checks the shared stylesheet (reduced motion may only change timing, never data geometry).
- `test/package-react.test.js`, `test/package-react-18.test.js` and `test/package-vue.test.js` mount the built `dist/react.js` and `dist/vue.js` wrappers in happy-dom and server-render them in a child process. The shared cases live in `test/adapters/` (helpers there are not named `*.test.js`, so neither script picks them up on its own). The React 18.3 run uses the `react-18`/`react-dom-18` npm aliases from `devDependencies`, and `test/adapters/react-18.js` redirects every `react`/`react-dom` import to them with `module.registerHooks()`, so the same dist file runs on both majors.
- `test/docs-snippets.test.js` statically checks the framework snippets in `README.md`, `docs/` and the demo (`demo/index.html` tabs, the `demo/app.js` catalog): no `JSON.stringify(` (bind `data` as a property instead), no HTML comments inside JSX, and Angular snippets use the AOT-safe recipe.
- `test/package-types.test.js` type-checks `test/types/entries.ts`, which imports every component subpath, `./math` and the root entries by package name, with `tsc` under `moduleResolution` `node16` and `bundler` (configs in `test/types/`). TypeScript resolves the names through the package's own `exports`, so it checks `dist/` as published.
- `test/package-angular.test.js` loads `@angular/compiler` (JIT) and renders `dist/angular.js` with TestBed in happy-dom: `MiniChartDirective` registration, inputs and outputs, the AOT-safe raw-element recipe, and the documented limitation of the signal directives. A real AOT build is not part of the suite.

## Package lint

`pnpm lint:package` runs [publint](https://publint.dev) and [`attw --pack`](https://github.com/arethetypeswrong/arethetypeswrong.github.io) ("Are the types wrong?") on the tarball `npm pack` would publish. Packing runs the `prepack` script, so it rebuilds `dist/` first. Both CI workflows run it after the build. Errors fail the step. Known problems are allowlisted explicitly:

- `attw --profile node16` skips the `node10` resolution mode (`moduleResolution: "node"`), which predates `exports` and cannot see subpaths such as `sparkline-mini-charts/math`.
- `attw --ignore-rules false-esm`, plus publint's warning that `types` "is interpreted as ESM when resolving with the `require` condition": each export has one ESM `.d.ts` for both its `import` and `require` conditions, so TypeScript projects that `require()` the CJS build get ESM types ("masquerading as ESM"). This is planned to be fixed with separate `.d.cts` declarations; remove the flag (and expect no publint warning) in that change.

Any other attw problem, including "missing types" (`untyped-resolution`) on any of the 24 entries, fails the step.

## Releasing

`npm publish` (or `pnpm publish`) runs `prepublishOnly` (`test:unit`, `build`, `test:package`) and then `prepack` (`build`, logging to stderr so `npm pack --json` and `npm publish --json` print clean JSON), so a tarball can't be published without a fresh `dist/`. Check the contents first with `npm pack --dry-run`.

## Pull requests

- Branch from `main` and keep each pull request focused on one change.
- CI must be green before merging.
- 1.x releases are semver-stable. A patch or minor release must not break the documented public API: tag names, attribute names, event names, CSS custom properties and package exports.
- Match the surrounding style. `src/core` and `src/components` are plain JavaScript with JSDoc, and every file starts with a `// file.js — description.` header. The framework adapters in `src/react`, `src/vue` and `src/angular` are TypeScript.

## Branch protection (maintainer setup)

The repository owner sets this up once in the GitHub settings, under **Settings → Branches** (or **Rules → Rulesets**), for `main`:

- require a pull request before merging;
- require the `Node 22` and `Node 24` status checks from the CI workflow to pass, and require the branch to be up to date. The checks show up in the picker only after the workflow has run once;
- block force pushes and branch deletion.
