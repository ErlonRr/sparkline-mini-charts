## 1. Adapter files
| File | Lines | Role |
|---|---|---|
| src/react.ts | 22 | Re-exports 17 wrappers + **only** `type MiniChartProps` (L22) |
| src/react/index.ts | 327 | 17 Props interfaces (L50-201), `createReactChart` factory (L212-272), 17 factory calls (L279-327) |
| src/vue.ts | 21 | Re-exports 17 wrappers, no types |
| src/vue/index.ts | 115 | `createVueChart` factory (L23-64), 17 calls (L67-115) |
| src/angular.ts → src/angular/index.ts | 23 + 23 | Double re-export layer |
| src/angular/mini-chart.directive.ts | 860 | helpers (L34-73), 17 hand-written directive classes (L78-789), `SPARKLINE_DIRECTIVES` (L798-816), catch-all `MiniChartDirective` (L821-860) |

## 2. Adapter behavior matrix
| Aspect | React | Vue | Angular |
|---|---|---|---|
| Construction | factory x17 | factory x17 | 17 copy-pasted classes (~43 lines each) + catch-all |
| Registration | **at module import** (L217), all 17 at once | lazily in `setup` (L43) | in each constructor (e.g. L99); **catch-all: none** (L842-859) |
| Props → DOM | every non-reserved prop kebab-cased; objects → `JSON.stringify`; booleans → `""`/omitted (L242-265), **including `style`/`className`** | only `data,label,interactive` declared (L27-40); everything else raw `attrs` (L47); Vue picks property vs attribute with `key in el` | one `input()` + one `effect()` per attribute → `setAttribute`/`removeAttribute` (`syncAttr` L34-40); JSON for gradient/zones/ranges (`syncJsonAttr` L43-51) |
| `data` | `JSON.stringify` → string (L233) | `JSON.stringify` → string (L48) | raw `el.data = d` (L104 and 17 copies) |
| Events | typed `onSparklineHover/Leave/SliceSelect/ZoneChange` **destructured and dropped** (L224-227); raw `onSparkline-hover` passed through (L245) | `emits` = 4 kebab names for every chart (L41); 4 listeners always attached (L50-53) | `output()` + `addEventListener` (L54-73), a subset per chart |
| Ref | `forwardRef`, typed `HTMLElement` (L216) | component instance (`$el`) | n/a |
| Typing | per-chart interfaces exist but are **not exported** from `./react`; `data/zones/ranges: any`; 26 kebab/camel duplicate pairs | `PropType<any>`, no per-chart props, untyped emits | per-chart inputs; enums typed `string`; `data: any`; kebab aliases |
| SSR | no `'use client'`; safe to import | safe to import; hydration re-patches CE props | effects write the DOM; `el.data` is a non-serialized expando on the server |
| Build | Vite ES+CJS | Vite ES+CJS | Vite ES+CJS, **not ngc** (no Ivy metadata) |

## 3. Runtime probe (in memory, no DOM): `el.data = X` on each prototype
| Charts | `el.data = "[1,2,3]"` (what wrappers send) | `el.data = [1,2,3]` |
|---|---|---|
| area, bar, gauge, half-pie, line, pie, progress, win-loss (base setter) | attribute becomes `"\"[1,2,3]\""` → getter `[]` → **empty chart** | OK |
| bullet, candlestick, combo, ohlc, radial-bar, range-bar, scatter, stacked-area, stream (getter-only override, 0 setters) | **TypeError: Cannot set property data … which has only a getter** | **TypeError** |

## 4. How each framework passes `data` to a custom element, and what happens today
| Framework | Mechanism (verified source) | Outcome |
|---|---|---|
| React 18.3.1 | always attributes; function props on CEs removed (react-dom.development.js:389-418); string `style` throws (L2961-2963) | data OK; events impossible; `style` crashes |
| React 19 | property if `name in node`, else attribute; `on<x>` → `addEventListener(x)`, case-sensitive (React 19 source; not installed locally) | data: empty (8 charts) or TypeError crash (9 charts) |
| Vue 3.5.41 | `shouldSetAsProp` → `return key in el` (runtime-dom L858); `el[key]=v` in try/catch + warn (L682-686); hydration re-patches all CE props (runtime-core L2207-2212) | **all 17 charts empty**, also after Nuxt hydration |
| Svelte 5.56.8 | collects setters along the prototype chain, finds the base `data` setter → `node.data = v` (attributes.js L588-615) | documented `data={JSON.stringify(x)}` → empty (8) or TypeError (9) |
| Preact 10 | property if `in dom`, try/catch fallback to setAttribute | arrays OK for 8 charts; the other 9 fall back to attribute `"1,2,3"` → empty |
| Solid | CE props set as properties (kebab→camel) | every option except data becomes an expando → ignored |
| Angular directive | `effect(() => el.data = d)` | OK for 8; TypeError for 9 |
| Lit | attribute, or property with `.data=` | `.data=${arr}` throws for 9 |

## 5. React prop transformation (src/react/index.ts:231-265)
| User writes | Sent to React | Result |
|---|---|---|
| `data={[1,2]}` | `data="[1,2]"` | R18 OK; R19 empty or TypeError |
| `style={{width:120}}` | `style='{"width":120}'` | React throws |
| `className="h-8"` | `class-name="h-8"` | no class applied |
| `tabIndex={0}` | `tab-index="0"` | not focusable |
| `gradient={false}` (area) | omitted | gradient stays ON (area:380-382) |
| `hollowBullish={false}` / `sharedDomain={false}` | omitted | still true (candlestick:102, combo:264) |
| `onSparklineHover={fn}` | dropped | never fires |
| `onSparkline-hover={fn}` | passed through | R18 dropped; R19 listens for `Sparkline-hover` |

## 6. Per-chart attributes and events (attribute lists are currently in sync across components, React and Angular)
| Chart | Extra observed attrs | `data` accessor | Dispatched events | Adapter events |
|---|---|---|---|---|
| line | curve, points, min, max, reference-value, trend-color | base | hover, leave | ok |
| bar | gap, radius, baseline, min, max | base | hover, leave | ok |
| area | curve, points, gradient, min, max, reference-value, trend-color | base | hover, leave | ok |
| stacked-area | curve, normalize | getter-only L74 | hover, leave | ok |
| stream | curve | getter-only L73 | hover, leave | ok |
| pie | inner-radius, donut, pad-angle, start-angle | base | hover, leave | Angular `sliceSelect` **never dispatched** |
| half-pie | inner-radius, donut | base | hover, leave | Angular `sliceSelect` **never dispatched** |
| radial-bar | sweep, **round-caps (absent = true)**, min, max, gradient | getter-only L78 | hover, leave | ok |
| progress | min, max, show-value, unit, gradient | base | hover, leave, **progress-complete** (L303) | progress-complete not exposed |
| gauge | min, max, zones, needle-type, show-value, gradient | base | hover, leave, zone-change (L384) | React `onZoneChange` dropped |
| candlestick | **hollow-bullish (absent = true)**, wick-width, gap, min, max | getter-only L69 | hover, **sparkline-select** (L172), leave | sparkline-select not exposed |
| ohlc | tick-width, gap, min, max | getter-only L61 | hover, leave | ok |
| combo | **shared-domain (absent = true)**, curve, bar-gap | getter-only L79 | hover, leave | ok |
| bullet | target, min, max, ranges, gradient | getter-only L69 | hover, leave | ok |
| win-loss | gap, radius, mode, win/loss/tie-color | base | hover, leave | ok |
| range-bar | gap, radius, min, max | getter-only L68 | hover, leave | ok |
| scatter | point-radius, trend-line, min-x, max-x, min-y, max-y | getter-only L70 | hover, leave | ok |

## 7. Multi-framework status
| Target | Today | Claimed? | Needed |
|---|---|---|---|
| Svelte | no adapter, no typings, doc snippet broken | README.md:11, getting-started.md:137-147, demo/index.html:3318-3331 | core fix + `svelte/elements` augmentation + docs |
| Solid | nothing | no | property accessors in core + `solid-js` JSX augmentation |
| Preact | nothing | no | `preact` JSX augmentation (or the React wrapper via compat once fixed) |
| Lit | nothing | no | `HTMLElementTagNameMap` + CEM (lit-analyzer) |
| Qwik / Astro | nothing (README.md:38 claims Astro SSR-safe) | partly | docs (client registration script), optional JSX types |
| Raw TS / IDE | no HTMLElementTagNameMap, JSX IntrinsicElements, Vue GlobalComponents, custom-elements.json, web-types, VS Code custom data; no `customElements` field; no @attr/@fires/@cssprop JSDoc | — | generate all of them |

## 8. Duplication metrics
- Angular: 17 classes, **135 `input()` + 135 `effect()`**, 17 `defineMiniChart`, the data effect copy-pasted 18 times.
- React: 17 interfaces, 26 kebab/camel duplicate props, 17 factory calls. Vue: 17 factory calls, no per-chart metadata.
- `mini-scatter-chart` appears in **14 files** (package.json x4, angular x4, react x3, vue x3, define.js x2, docs x3, …).
- The attribute list for each chart is maintained by hand in at least 5 places: component `observedAttributes`, React interface, Angular inputs, Angular effects, docs/components/*.md. The demo adds 17 x 3 more copies (`reactProps`/`vueProps`/`angularProps`, demo/app.js:379-381…).

## 9. Versions and peers
- peerDependencies (package.json:187-190): `@angular/core >=20.0.0`, `react >=18.0.0`, `vue >=3.5.0`, all with no upper bound.
- devDependencies: react ^19.2.8, @angular/core ^22.1.1, vue ^3.5.41. Missing: react-dom, ng-packagr, @angular/compiler-cli, any testing library.
- Every Angular API used (input, output, effect, booleanAttribute, numberAttribute, inject) is stable in v20, yet the code and docs say "Angular 22+" (directive L1, README.md:243, demo/index.html:3276).
- All adapters ship ES + CJS (vite.config.js:40); Angular is ESM-only.