## 1. Entry points: vite.config.js vs package.json exports vs emitted types

| Export key | Vite entry (vite.config.js) | `types` in exports | Where vite-plugin-dts (rollupTypes:false, entryRoot=src) emits it | Status |
|---|---|---|---|---|
| `.` | src/index.js (:13) | dist/index.d.ts | dist/index.d.ts | OK |
| `./define` | src/define.js (:14) | dist/define.d.ts | dist/define.d.ts | OK |
| `./register` | src/register.js (:15) | dist/register.d.ts | dist/register.d.ts | OK (empty module) |
| `./mini-*-chart` ×17 | src/components/*.js (:16-32) | dist/mini-*.d.ts | dist/components/mini-*.d.ts | **Mismatch (likely missing)** |
| `./math` | src/core/geometry.js (:33) | dist/math.d.ts | dist/core/geometry.d.ts | **Mismatch (likely missing)** |
| `./angular` | src/angular.ts (:34) | dist/angular.d.ts | dist/angular.d.ts (shim file) | OK path; no Ivy metadata |
| `./react` | src/react.ts (:35) | dist/react.d.ts | dist/react.d.ts (shim) | OK path; per-chart Props not re-exported |
| `./vue` | src/vue.ts (:36) | dist/vue.d.ts | dist/vue.d.ts (shim) | OK path |

- 24 Vite entries = 24 export keys, same order. Every key has `types`/`import`/`require`. No `default` condition, no `./package.json`, single `types` for both ESM and CJS.
- `sideEffects`: `register.js/.cjs`, `react.js/.cjs`. Module-level effects actually exist in register (calls defineMiniCharts) and react (17× defineMiniChart at import). vue registers lazily in setup; angular, define, components and math have no module-level effects.
- Externals: `@angular/core`, `react`, `vue` (vite.config.js:45). `build.target` not set. `sourcemap: true`.

## 2. Dependencies / toolchain (package.json + pnpm-lock.yaml)

| Item | Declared | Resolved | Note |
|---|---|---|---|
| typescript | ^7.0.2 | 7.0.2 (native) | `tsc --noEmit` typecheck; also the peer resolved for unplugin-dts |
| @typescript/typescript6 | ^6.0.2 | 6.0.2 → alias typescript@6.0.3 | referenced by nothing |
| vite | ^8.2.1 | 8.2.1 (rolldown 1.2.3) | demo config still uses `rollupOptions` |
| vite-plugin-dts | ^5.0.3 | 5.0.3 → unplugin-dts 1.0.3 | dts from JSDoc via allowJs/checkJs |
| @angular/core | dev ^22.1.1 / peer >=20 | 22.1.1 (engines node ^22.22.3‖^24.15‖>=26) | no compiler-cli/ng-packagr; CHANGELOG says "22+" |
| react / @types/react | dev ^19.2.8 / peer >=18 | 19.2.8 | no React 18 testing |
| vue | dev ^3.5.41 / peer >=3.5 | 3.5.41 | |
| engines | node >=22 | n/a | browser lib; CI runner label `batcave-node22`; local node v26.10.0 |
| packageManager | pnpm@11.20.0 | via corepack in CI | |

## 3. Test inventory (node --test, no DOM lib)

| File | Tests | Technique | Covers | Not covered |
|---|---|---|---|---|
| test/geometry.test.js | 15 | pure unit | 14 of 18 geometry functions + parseNumericData, mostly one happy path each | createCandlestickLayout, createRadialBarLayout, describeArc, polarToCartesian; edge cases (empty/NaN/degenerate) not locked in |
| test/components.test.js | 12 | hand-written fake HTMLElement/TestNode/registry (:6-214) | registration order + idempotency, viewBox, part counts, role/aria-valuenow for gauge/progress/bullet, gradient `<linearGradient>` presence | attribute re-render, `data` property, labels/title, events (no-op dispatch), cleanup (asserts `ok(true)`), CSS/theming (style stubbed), interaction; adapters only `typeof` and **fails without dist** |
| test/package.test.js | 2 | JSON shape snapshot | export key list, regex on paths, exact sideEffects list | that files exist, types resolve, ESM/CJS load |
| test/ssr-import.test.js | 1 | import with HTMLElement/customElements undefined | src/index.js and src/register.js evaluate | dist, adapters, rendering without `document` |

Local run: geometry/package/ssr give 18/18 pass. components gives 11 pass, 1 fail (ERR_MODULE_NOT_FOUND dist/react.js). No coverage, browser runner, visual, a11y, type tests or size checks.

## 4. `data` property setter check (in-memory, stubbed HTMLElement)

| Works (base setter) | Throws `TypeError … has only a getter` |
|---|---|
| Area, Bar, Gauge, HalfPie, Line, Pie, Progress, WinLoss | Bullet, Candlestick, Combo, OHLC, RadialBar, RangeBar, Scatter, StackedArea, Stream |

`el.data = "[1,2,3]"` (what the React 19/Vue wrappers effectively do) produces attribute `"\"[1,2,3]\""` and parses to `[]` on the 8 working ones.

## 5. Custom event contract

| Event | Dispatched by | React wrapper | Vue wrapper | Angular |
|---|---|---|---|---|
| sparkline-hover / sparkline-leave | all 17 | typed but **dropped** (react/index.ts:224-229) | emitted | outputs |
| sparkline-select | candlestick (:172) | – | – | – |
| zone-change | gauge (:384) | typed, dropped | emitted | output (gauge + catch-all) |
| progress-complete | progress (:303) | – | – | – |
| slice-select | **none** | typed | emitted | output (pie, half-pie) |

## 6. CI (.forgejo/workflows/ci.yaml)
Trigger: `push` (all branches). Steps: checkout, corepack pnpm 11.20, `pnpm install --frozen-lockfile`, typecheck, test, build, build:demo, `rm -rf /deploy/sparkline-mini-charts/*` + `cp`, `ls` verify. Missing: PR trigger, branch filter, concurrency, cache, lint/format, publint/attw, size-limit, coverage, Node/browser matrix, release/publish job. Origin remote is GitHub (no .github/workflows). Vercel (vercel.json) builds lib+demo without tests.

## 7. Theming tokens: documented vs used
README documents 8 rows (`--mini-chart-color`, `-color-1..8`, `-stroke-width`, `-bullish/-bearish-color`, `-safe/-warn/-danger-color`, `-track-color`). About 50 distinct `--mini-chart-*` properties are used in src, plus non-namespaced `--primary` (bullet, scatter). The default for `--mini-chart-color` varies by component (#2563eb, #3b82f6, #10b981); README says #0ea5e9.

## 8. Docs / repo files
- docs/architecture.md (43 lines), docs/getting-started.md (170), docs/demo-guide.md (42), docs/components/*.md (17, not audited).
- CHANGELOG versions: 0.1.0, 1.0.0, 1.0.1, 1.1.0, 1.2.0, 1.2.1, 1.3.0, 1.3.1 (never versioned), 1.4.0 (untagged). Git tags: v1.0.0 to v1.3.0.
- skills-lock.json: lockfile for AI coding-agent "skills" (24 entries from GitHub repos plus one local path), version 1; not published (not in `files`).
- Missing: lint/format config, .editorconfig, .nvmrc, CONTRIBUTING, SECURITY, templates, Renovate, custom-elements.json.