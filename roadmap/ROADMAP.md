# Piano: sparkline-mini-charts, dalla 1.4.0 a una 2.0 stabile e multi-framework

Identificatori, path e tipi restano in inglese. I riferimenti `file:riga` si riferiscono al commit `5a9322d` (v1.4.0).

---

## 1. Contesto

Hai chiesto un piano con un backlog preciso per rendere la libreria stabile, migliorare codice e strutture dati, sistemare il theming e renderla multi-framework.

**Come è stato costruito il piano**
1. Un audit in sola lettura su 9 aree: core, componenti cartesiani, barre e financial, radiali, geometria, theming, adapter, packaging, API dei dati. Ha prodotto **234 finding: 18 critical, 88 high, 90 medium, 38 low**, ciascuno con evidenza `file:riga`. I difetti critici sono stati trovati in modo indipendente da 3-6 agenti diversi.
2. Tre architetti indipendenti hanno proposto un piano ciascuno, con priorità diverse: stabilità incrementale, architettura pulita, multi-framework/DX.
3. Un giudice li ha confrontati e ha scelto "stability-first", innestando le idee migliori degli altri due.
4. Un critico ha controllato che ogni finding critical e high sia davvero risolto. Le sue 14 correzioni tecniche e 12 correzioni d'ordine sono integrate qui.

**Il problema di fondo.** Mancano quattro contratti scritti: **dati, proprietà/attributi, eventi, token di tema**. A questo si somma il codice duplicato, che costringe a ripetere ogni correzione fino a 17 volte.

| Area | Stato attuale (1.4.0) |
|---|---|
| Codice | 17 componenti in 5.587 righe. Circa il 44% delle righe è ripetuto. 5 coppie sono quasi cloni (88-96%): line/area, pie/half-pie, stacked/stream, gauge/progress, candlestick/ohlc. Tutti i 17 componenti sovrascrivono `render()`, quindi `renderChart()` della base è codice morto |
| Contratto dati | 9 componenti su 17 ridefiniscono solo `get data()`: `el.data = x` lancia `TypeError`, ed è proprio quello che fanno le direttive Angular. Il setter base applica `JSON.stringify` alla stringa che i wrapper React/Vue hanno già serializzato: React 19 e Vue la assegnano alla proprietà, quindi doppia codifica e grafico vuoto. Un `null` fa crashare range-bar, scatter e bullet. `parseNumericData` filtra i valori e sposta gli indici. Ci sono 17 forme dati diverse e nessun tipo |
| Adapter | Angular è compilato da Vite e non da ngc: inutilizzabile in AOT. La 1.4.0 è passata a `input()`/`effect()`, invisibili quando il codice arriva da node_modules, e ha tolto la registrazione: un breaking change in una minor. React serializza `style` (crash), trasforma `className` in `class-name` e scarta i callback degli eventi. Vue dichiara solo 3 prop. Non ci sono tipi per gli elementi raw né un Custom Elements Manifest. Il supporto Svelte esiste solo nel README |
| Eventi | 17 forme diverse di `detail`. `slice-select` è dichiarato ovunque ma mai emesso. `detail.element` espone nodi interni dello shadow DOM. Gli eventi riportano i colori di palette, non quelli del tema |
| Theming | Circa 51 token `--mini-chart-*`: ne sono documentati correttamente circa 14. Ci sono collisioni: `--mini-chart-stroke-width` vale 2px per le linee e 14/12 unità per gauge/progress, `--mini-chart-range-color` è una banda in un grafico e un riempimento nell'altro. I componenti leggono `--primary`/`--surface` dell'app ospite e ci sono 4 accenti di default diversi. Con reduced motion attivo, `stroke-dashoffset:0 !important` disegna progress e radial-bar sempre al 100%. `trend-color` cancella lo style inline dell'host. Mancano dark mode, preset e forced-colors |
| Qualità e rilascio | 30 test su un fake DOM scritto a mano. Su un checkout pulito la suite fallisce: importa `dist/` e la CI testa prima del build. I tipi dei subpath per componente quasi certamente non vengono emessi. Mancano `prepack`, una pipeline di rilascio e il tag v1.4.0. La CI Forgejo fa deploy da ogni branch. Il remote `origin` è GitHub `ErlonRr`, mentre package.json indica `ErlonRru` |

**Strategia (strangler)**
1. Prima la CI verde e una rete di test sul ciclo di vita.
2. Poi patch che correggono i bug senza cambiare l'API (1.4.1, 1.4.2).
3. I nuovi contratti entrano accanto ai vecchi attraverso punti di aggancio economici: ogni minor 1.x è additiva e reversibile.
4. Un solo **schema TypeScript per chart** fa da fonte di verità sia a runtime sia per il codegen di wrapper, tipi e docs.
5. Le implementazioni vengono sostituite **una famiglia alla volta** su una base `ChartElement`, con la pipeline pura `normalize → computeModel → reconcile`.
6. La 2.0 non aggiunge codice: cambia i default annunciati e rimuove ciò che non si può mantenere con uno shim.

---

## 2. Decisioni

### 2.1 Decisioni assunte: ti ho fatto la domanda, nessuna risposta; questi sono i default raccomandati

| # | Assunzione | Se la rifiuti |
|---|---|---|
| A1 | **2.0 con API pulita.** Gli alias deprecati (attributi, token, forme dati, eventi) restano per tutta la 2.x nel layer `compat`, attivo di default, con warning solo in dev. Spariscono in 3.0. Prima escono le patch 1.4.x non-breaking | P10 diventa una 1.13 con compat sempre attivo; le fasi da 1.5 a 1.12 non cambiano |
| A2 | **TypeScript strict, migrazione incrementale.** Il core passa a TS in 1.5, ogni famiglia passa a TS quando migra, tutto è TS in 1.12 | Si resta su JSDoc + checkJs; P2-6 e P9-1 si riducono |
| A3 | **Monorepo pnpm.** Il core resta `sparkline-mini-charts`, con zero dipendenze runtime. Gli adapter sono `@sparkline-mini-charts/{react,vue,angular}`; Angular è compilato con ng-packagr. Versioni in lockstep (gruppo `fixed` di Changesets). Bisogna registrare lo scope npm | Solo Angular diventa un pacchetto separato (lo impone ng-packagr); React e Vue restano subpath |
| A4 | **Wrapper generati solo per React, Vue e Angular.** Svelte 5, Solid, Preact, Lit, Qwik e Astro ricevono tipi (JSX, `HTMLElementTagNameMap`, CEM) e ricette. **Nessun wrapper Svelte**: Svelte 5 assegna come proprietà quando esiste un setter e lega nativamente gli eventi (`onsparkline-hover`). Con le proprietà tipizzate (1.6) e l'augmentation `svelte/elements` (1.7) l'elemento raw è già di prima classe; un wrapper aggiungerebbe solo una toolchain e un'altra superficie di rilascio. La scelta è formalizzata in un ADR (P5-4) | Si aggiunge un pacchetto `@sparkline-mini-charts/svelte` generato in P5 |

### 2.2 Decisioni aperte e default raccomandato

| # | Decisione | Default raccomandato |
|---|---|---|
| D1 | Scope npm | Registrare l'org `@sparkline-mini-charts` subito, in P0-11, per evitare squatting. Nomi di ripiego: `sparkline-mini-charts-angular` e simili |
| D2 | Forge canonico e identità | GitHub `ErlonRr/sparkline-mini-charts` con GitHub Actions, che abilita il trusted publishing OIDC con provenance. Forgejo resta solo come mirror (il trusted publishing npm non lo supporta). package.json va corretto da `ErlonRru` a `ErlonRr` |
| D3 | Hosting della demo | Solo Vercel: preview per ogni PR, produzione da main. Il deploy self-hosted su `/deploy` va ritirato oppure limitato a main |
| D4 | Versioni minime dei framework | Angular ≥ 20 (peer ^20, ^21 e ^22; il "22+" oggi documentato è sbagliato), React ^18.3 e ^19, Vue ^3.5 |
| D5 | Cambi visivi | I bug evidenti si correggono in 1.x sotto "Fixed (visual)", con immagini prima/dopo. I cambi di default (`gaps="break"`, `max` 100 per radial-bar, palette accessibile) arrivano solo in 2.0, con opt-in disponibile prima |
| D6 | Riflessione di `el.data` sull'attributo | Resta per tutta la 1.x, perché README.md:37 la promette. Dalla 1.6 c'è un opt-out per i dati live; la riflessione viene tolta in 2.0 |
| D7 | Packaging in 2.0 | Solo ESM; il core perde `./react`, `./vue` e `./angular`; la root non esporta più la geometria |
| D8 | Versioni minime dei browser | Il minimo imposto da color-mix: Chrome 111, Safari 16.2, Firefox 113. Fallback per `:state()` (Chrome 125, Safari 17.4), `light-dark()` (Chrome 123, Safari 17.5, Firefox 120) e `adoptedStyleSheets` (Safari 16.4). Il minimo si verifica con un lint sul dist (P2-2) |
| D9 | Naming pubblico | Restano il prefisso eventi `sparkline-*` e l'accento `--mini-chart-color` |
| D10 | Palette in 2.0 | Diventa default la palette accessibile; l'aspetto 1.x resta disponibile con `themes/classic.css` |
| D11 | Tagli di scope | SSR con Declarative Shadow DOM fuori dalla 2.0: il seam `computeModel` lo rende possibile in 2.1. Niente Storybook. Sito docs + demo con Astro Starlight: scheletro in 1.7, cutover del dominio in 1.8, chiusura in 1.12 (D13). Codemod rinviabile alla 2.1 |
| D12 | Manutenzione della 1.x | Il branch `release/1.x` nasce alla prima `2.0.0-next`; fino ad allora le patch escono da main. Dopo la 2.0: 6 mesi di fix critici e di sicurezza |

### 2.3 Demo e configurazione per chart: decisioni aggiunte

Le hai chieste dopo l'approvazione del piano. Le domande sono rimaste senza risposta, quindi valgono i default qui sotto.

| # | Decisione | Default raccomandato |
|---|---|---|
| D13 | Un solo sito docs + demo | `apps/docs` (Astro Starlight) sostituisce `demo/`. Sequenza: scheletro in 1.7 (P4-5), pagine dei chart generate in 1.7 (P4-6), configuratore, `/live/` e cutover del dominio in 1.8 (P5-5a/b, P5-6), theme studio in 1.11 (P8-9), chiusura in 1.12 (P9-3). **`demo/` è in feature freeze da subito**: solo hotfix (P1-18, P1-19). In P2-1 si sposta in `apps/demo/` cambiando solo import e config di build, e al cutover viene eliminata. **Se la rifiuti:** si tiene una SPA separata che consuma comunque `chart-meta.json`, gli esempi di P4-3 e `<smc-configurator>`, quindi nessun lavoro va perso |
| D14 | Lingua del sito | Al lancio solo inglese. In Starlight si configura subito `locales: { root: { lang: 'en' } }`, così `/it/` si può aggiungere più avanti senza cambiare gli URL. La demo legacy tiene il toggle EN/IT fino al cutover |
| D15 | Tecnologia delle isole | Custom element TypeScript vanilla (`<smc-configurator>`, `<smc-theme-studio>`, `<smc-live-board>`), privati del sito e non pubblicati su npm. **Non sono isole `client:*`**: in Astro quelle direttive funzionano solo con componenti di un framework UI. Ogni isola è un componente `.astro` che rende il tag e uno `<script>` in bundle; lo script importa il modulo in lazy dietro un IntersectionObserver (subito su `/playground/` e sugli URL condivisi). Niente React, Preact né Storybook |
| D16 | Precedenza della configurazione (dal livello più forte) | 1. attributo o proprietà esplicita; 2. `options` d'istanza; 3. valori dentro i dati (min/max/target/ranges di meter e bullet, `Datum.color`); 4. `preset` d'istanza (vince il nome più a destra); 5. default per tipo del registry (la chiave tag vince su `'*'`); 6. default dello schema, oppure catena di token CSS per le prop con canale CSS. Si risolve in **due fasi**: (a) livelli 1, 2, 4, 5 e 6 senza dati; (b) normalize con quelle opzioni; (c) i valori dai dati coprono solo le chiavi che 1 e 2 non impostano. Il livello esplicito ha due sotto-livelli (attributo e proprietà) e una guardia `#reflecting`: un `false` assegnato come proprietà sopravvive alla propria riflessione |
| D17 | Opzione o token | È un'**opzione** ciò che cambia `computeModel`, l'insieme dei segni, l'albero a11y o il significato del grafico. È un **token** ciò che ridipinge segni esistenti. Le prop visive che già esistono (`win-color`, `wick-width`, `tick-width`, `corner-radius`, stop dei gradient) ricevono il flag `css: '--_mc-x'`: a livello d'istanza scrivono la var privata, sono rifiutate nei default di registry e non se ne aggiungono di nuove |
| D18 | Serializzazione | In 1.x non esiste un attributo JSON `options`: ogni opzione ha già il suo attributo e `preset` copre il riuso da HTML e in SSR. Funzioni come `formatter` e `messages` sono solo proprietà, mai in options, preset, URL o configuratore |
| D19 | Budget del sito (gate in CI da P4-5) | **Accessibilità:** WCAG 2.2 AA; axe a 0 violazioni serious/critical su ogni pagina in light, dark, forced-colors e reduced-motion; i problemi dovuti alla libreria stanno in un'allowlist con scadenza, ciascuno legato a P7-4. **Lighthouse mobile** (home, chart, playground, theming): Accessibility 100, Performance ≥ 90, LCP ≤ 2,0 s, CLS ≤ 0,05, TBT ≤ 200 ms. **JS:** ≤ 60 KB gz per pagina esclusi i moduli chart, configuratore ≤ 25 KB gz. **Altro:** 0 richieste a terze parti (font self-hosted), nessuno scroll orizzontale a 320/768/1280 px, 0 errori in console, link checker verde |

---

## 3. Architettura target (stato alla 2.0; tra parentesi la versione in cui ogni pezzo arriva)

### 3.1 Repository e pacchetti (1.5)

```
sparkline-mini-charts/                 root del workspace pnpm (privata)
├─ packages/core/       npm "sparkline-mini-charts": 0 dipendenze runtime
│  └─ src/  core/   chart-element scheduler props options deprecations dev events styles
│                   internals reconcile ids animation interaction a11y format gradient registration
│           model/  marks chart-model          data/  types issues normalize/*
│           math/   frame scale/ domain/ path/ shape/ shape/curves/ layout/ stats/ sample/
│           theme/  tokens base-sheet series palette api mini-chart-theme presets/*.css
│           charts/ cartesian stacked combo financial slices radial-bar meter bars scatter
│                   (per famiglia: <family>-chart.ts, <tag>.ts, <tag>.schema.ts, <tag>.docs.ts, <family>.css.ts)
│           meta/   types, index (registry dei 17 schemi)   compat/ (solo 2.x)   types/ (GENERATI)
│           define.ts register.ts index.ts extend.ts
├─ packages/react/  packages/vue/   generati, tsdown, solo ESM (1.8)
├─ packages/angular/                ng-packagr, APF, compilazione parziale (1.5)
├─ packages/codemod/                (2.0, rinviabile)
├─ tools/codegen/                   privato: schema → CEM, tipi, wrapper, esempi, docs, tokens.json, preupgrade.css, MIGRATION
├─ tools/palette-check/  tools/scripts/ (pack-and-install, compare-pack, check-source, check-docs)
├─ apps/demo/  apps/docs/ (Astro Starlight)
├─ fixtures/   vite-vanilla sveltekit solid-vite astro next-app-router-raw angular-aot   (1.7)
│              vite-react18 next-app-router nuxt angular-ssr                             (1.8)
└─ .changeset/ .github/workflows/{ci,release,fixtures}.yml  tsconfig.base.json biome.json knip.json renovate.json
```

**Entry pubblici del core in 2.0:**
- `.`, `./define`, `./register`
- `./mini-<x>-chart` e `./mini-<x>-chart/define` (foglie che si auto-registrano)
- `./math`, `./math/experimental`, `./types`, `./theme`, `./themes/*.css`, `./preupgrade.css`, `./compat`
- `./jsx/{react,preact,solid}`, `./types/{svelte,vue}`, `./custom-elements.json`, `./package.json`

**Esistono solo in 1.x:** CJS, `./react`, `./vue`, `./angular` e i re-export della geometria dalla root.

### 3.2 Schema per chart: fonte unica di verità (1.6)

```ts
// packages/core/src/meta/types.ts. La parte runtime non contiene prosa: le descrizioni stanno in <tag>.docs.ts
export type PropType = 'number' | 'boolean' | 'string' | 'enum' | 'json' | 'colorList' | 'angle';
export interface PropDescriptor<T = unknown> {
  type: PropType; attribute?: string | false; default?: T; values?: readonly string[];
  min?: number; max?: number; clamp?: boolean; reflect?: boolean;
  legacyBoolean?: 'default-true';            // solo 1.x: la stringa "false" spegne il flag
  tsType?: string; since?: string;
}
export interface Deprecation {
  kind: 'attribute' | 'value' | 'property' | 'token' | 'part' | 'event' | 'data-shape';
  from: string; to?: string; map?: Readonly<Record<string, string>>; since: string; removeIn: '2.0.0' | '3.0.0';
}
export interface ChartSchema<M = unknown, O extends object = object> {
  tag: `mini-${string}-chart`; className: string; family: string; aspectRatio: `${number} / ${number}`;
  data: { normalize: Normalizer<M, O>; tsInput: string; csv?: boolean };
  props: { readonly [K in keyof O]: PropDescriptor<O[K]> };
  events: Readonly<Record<string, { detail: DetailType; cancelable?: boolean }>>;
  parts: readonly string[]; tokens: readonly string[]; deprecations?: readonly Deprecation[];
}
```

**Cosa produce lo schema**
- **A runtime:** `observedAttributes`, accessor, coercizione dei valori, risoluzione degli alias.
- **A build time (codegen):** CEM, tipi, wrapper, esempi, tabelle docs, `preupgrade.css`, MIGRATION, regole del codemod.

**Regole**
- Nessuna chiave di prop può già esistere su `HTMLElement.prototype`: la CI lo verifica. Oggi `normalize` (stacked-area) collide con `Node.prototype.normalize()`, e React 19, Vue e Preact la trattano come proprietà, quindi l'opzione non fa nulla. Diventa `offset="expand"`.
- Il campo `tokens` elenca solo token davvero consumati.
- Peso a runtime degli schemi: meno di 2,5 KB min+gz, verificato con size-limit.

### 3.3 `ChartElement`, ciclo di vita, modello di rendering (1.10)

```ts
export abstract class ChartElement<M, O extends object> extends HTMLElementBase {  // HTMLElementBase = globalThis.HTMLElement ?? class {} (import SSR-safe)
  static schema: ChartSchema;
  get updateComplete(): Promise<boolean>;
  requestUpdate(key?: keyof O | 'data'): void;
  protected abstract computeModel(ctx: ComputeContext<M, O>): ChartModel;   // puro, serializzabile: golden JSON in node
  protected didCommit?(prev: ChartModel | null, next: ChartModel, ctx: ComputeContext<M, O>): void;
}
export interface ChartModel {
  viewBox: readonly [number, number]; marks: readonly Mark[]; defs: readonly Def[];
  hit: { mode: 'nearest-x'; xs: Float64Array; series: number } | { mode: 'mark' } | { mode: 'whole' };
  a11y: { role: 'img' | 'meter' | 'group'; label: string; valueNow?: number; valueMin?: number; valueMax?: number; valueText?: string };
  state: { empty: boolean; trend?: 'up' | 'down' | 'flat' };
}
// Mark = path | rect | circle | line | text | group, con key, part e vars private (`--_mc-*`): è l'unico canale per i colori
// reconcile(svg, prev, next): pool con chiavi; scrive solo le differenze; mai innerHTML (compatibile Trusted Types); rimuove i nodi in eccesso
// localId('clip' | 'grad' | 'mask', i): id deterministici per shadow root, niente Math.random
```

**Ciclo di vita**
1. **constructor:** `attachInternals()`, poi `this.shadowRoot ?? attachShadow({mode:'open', delegatesFocus:true})` (tollera uno shadow root dichiarativo già presente).
2. **connected:**
   - upgrade delle proprietà impostate prima del `define`;
   - adozione del foglio di stile, con cache **per documento** (`WeakMap<Document, CSSStyleSheet>`), perché un foglio costruito non si può adottare in un altro documento;
   - al primo connect, listener delegati sullo shadowRoot, **mai staccati**;
   - ResizeObserver e matchMedia sotto un `AbortController` legato alla connessione.
3. **Scheduler:** un microtask per batch, con il set delle chiavi cambiate. L'upgrade produce un solo render. Ordine: normalize (memo) → `computeModel` → `reconcile` → a11y/stati → eventi edge-triggered → `updateComplete`.
4. **Error boundary:** stato vuoto, `:state(error)`, evento `sparkline-error`, un solo `console.error` in dev.
5. **L'host non si tocca mai:** niente `this.style`. Lo stato passa da `:state()` con fallback `data-*` sullo svg interno; il focus da tastiera va sullo svg interno via `delegatesFocus`.

### 3.4 Modello dati e `normalize()` (1.9)

```ts
export type NumberLike = number | null | undefined;              // null, undefined o NaN = buco
export interface Datum { value: NumberLike; x?: number | Date | string; label?: string; color?: string }
export type SeriesInput = readonly NumberLike[] | readonly Datum[];
export interface Series { id?: string; name?: string; color?: string; data: SeriesInput }
export type MultiSeriesInput = readonly (readonly NumberLike[])[] | readonly Series[];      // sempre series-major
export interface OhlcDatum { open: number; high: number; low: number; close: number; volume?: number; x?: number | Date | string }
export interface RangeDatum { low: number; high: number; value?: number; x?: number | Date | string; label?: string }
export interface ScatterDatum { x: number; y: number; size?: number; label?: string; color?: string }
export interface ComboInput { series: readonly (Series & { type: 'bar' | 'line' | 'area' })[] }
export type MeterInput = number | { value: number; min?: number; max?: number };
export type BulletInput = number | { value: number; target?: number; ranges?: readonly number[]; min?: number; max?: number };
export type OutcomeDatum = -1 | 0 | 1 | boolean | 'W' | 'L' | 'T' | null | { outcome: 'win' | 'loss' | 'tie'; label?: string };
export interface DataIssue { code: 'not-finite' | 'wrong-shape' | 'ohlc-invariant' | 'negative-part-to-whole' | 'deprecated-shape' | 'parse-error' | 'out-of-domain' | 'invalid-color'; index?: number; seriesIndex?: number; value?: unknown; message: string }
export type Normalizer<M, O = unknown> = (input: unknown, ctx: { options: Readonly<O>; source: 'property' | 'attribute' }) => { readonly model: M; readonly issues: readonly DataIssue[] };
export interface SeriesModel { values: Float64Array /* NaN = buco */; x: Float64Array | null; labels: readonly (string | undefined)[] | null; sourceIndex: Int32Array; datum: readonly unknown[] }
```

| Normalizzatore | Chart | Input canonico | Input legacy, accettato fino alla 3.0 |
|---|---|---|---|
| series | line, area, bar | `NumberLike[]`, `Datum[]`; l'attributo accetta anche CSV `"1, 2 3"` | `number[]` |
| multi-series | stacked, stream | `Series[]` | `number[][]` |
| combo | combo | `{series:[{type, values}]}` | `{bar, line}[]` |
| ohlc | candlestick, ohlc | `OhlcDatum[]`, oppure tuple con `format="ohlc\|tohlc\|ohlcv"` | `[o,h,l,c,…]` (il dominio usa solo o/h/l/c) |
| range | range-bar | `RangeDatum[]` | `[lo,hi,cur?]`, `{min,max,current}` |
| points | scatter | `ScatterDatum[]` | `[x,y,r?]`; `[v]` diventa (indice, v) |
| radial | pie, half-pie, radial-bar | `(NumberLike \| {value,label,color})[]` | `number[]` |
| meter | gauge, progress | `MeterInput` | `[value,min,max]` posizionale |
| bullet | bullet | `BulletInput` | `[value,target,…ranges]` |
| outcomes | win-loss | `OutcomeDatum[]` | segno del numero |

**Regole**
- I normalizzatori sono puri e SSR-safe, non lanciano mai, non spostano mai gli indici e restituiscono output congelato e memoizzato.
- Il percorso attributo fa `JSON.parse` (o CSV per le serie piatte), poi usa lo stesso normalizzatore. Il CSV serve agli autori di HTML e all'SSR di Svelte 5, che applica `String()` agli array; l'SSR di Vue invece scarta gli array.
- I colori che arrivano dai dati si validano con `CSS.supports('color', v)`.
- `gaps`:
  - `drop` è il default 1.x;
  - `break` e `connect` arrivano con ogni famiglia migrata;
  - `break` diventa il default in 2.0.

  Senza una linea da spezzare, il buco si rende così: bar e win-loss lasciano lo slot vuoto, scatter omette il punto.
- Gli issue vanno a `warnOnce` in dev e diventano sempre un evento `sparkline-data-issue`.

### 3.5 Contratto eventi (additivo in 1.6, ripulito in 2.0)

```ts
export interface SparklinePointDetail<D = unknown> {
  chart: ChartKind; index: number; sourceIndex: number /* dalla 1.9 */; seriesIndex: number;
  value: number | null; values?: Readonly<Record<string, number>>; datum: D; formattedValue: string; label?: string;
  color: string /* getComputedStyle: riflette il tema */; percent?: number;
  clientX: number; clientY: number; pointerType: 'mouse' | 'touch' | 'pen' | 'keyboard';
}
export interface SparklineThresholdDetail { kind: 'band' | 'target' | 'complete'; value: number; from: number | null; to: number | null }
// HTMLElementEventMap: sparkline-hover | -leave | -select (cancellabile) | -threshold | -data-issue | -error
```

**Regole**
- Tutti gli eventi sono `bubbles` e `composed`.
- L'hover scatta solo quando cambia `(seriesIndex, index)`.
- Nessun nodo interno nel detail: `element` resta in 1.x come getter deprecato.
- In 1.x i vecchi nomi (`zone-change`, `progress-complete`, `slice-select`) vengono emessi insieme ai nuovi.
- Gli output dei wrapper si generano dalla stessa tabella: `onSparklineHover` (React), `@sparkline-hover` (Vue), `(sparklineHover)` (Angular), `onsparkline-hover` (Svelte 5), `on:sparkline-hover` (Solid).

### 3.6 Controller condivisi (1.10)

- **styles:** un `CSSStyleSheet` per classe e per documento, con fallback a un solo `<style>` che accetta un `nonce` per le CSP strette. Nessuna interpolazione nel CSS.
- **animation:** WAAPI più tween in JS.
  - `reveal`, `stagger` (delay = i/n × ≤300 ms), `tween` (ricalcola `computeModel` a ogni frame), `morph` (punti ricampionati: WebKit non anima `d`).
  - Rispetta reduced motion e l'attributo `motion`; niente reflow forzati né `setTimeout`.
- **interaction:**
  - strategie `nearest-x` (ricerca binaria), `mark` e `whole`;
  - puntatore convertito con `getScreenCTM().inverse()`, corretto anche col letterboxing;
  - tastiera con indice roving: frecce, Home, End, Enter/Space per select, Esc per leave.
- **a11y:**
  - un grafico non interattivo usa `role=img` o `meter`;
  - un grafico interattivo usa `role=group` con `aria-roledescription`, perché img e meter hanno figli presentazionali e i punti focalizzabili sparirebbero;
  - la live region sta fuori da sottoalberi presentazionali;
  - `aria-label` e `aria-labelledby` dell'host vengono rispettati;
  - riassunto calcolato dal modello;
  - `locale`, `value-format`, proprietà `formatter` e hook `messages` per i testi generati (i18n).
- **gradient:** grammatica rigorosa; stop da `--mini-chart-gradient-1..3`; `stop-color` passato via style, così `var()` funziona.

### 3.7 Modulo math (1.9)

**Moduli**
- `frame`: unica fonte di viewBox e padding.
- `scale/{linear,band,sqrt}`: invert, clamp, nice; la scala band ha `center(i)`.
- `domain/{extent,resolveDomain}`: un solo passaggio, niente spread; min<max validato; `include`.
- `path-builder`: precisione 2, sicuro con NaN.
- `shape/{line,area,arc}`: `defined` per i buchi; x non uniforme da `SeriesModel.x`.
- `curves`: `smooth` significa monotone-X; catmull-rom è opt-in.
- `layout/*`: restituisce `{domain, scales, items}`.
- `stats/linearRegression`: centrata sulla media.
- `sample/{lttb,min-max}`.

**Superficie pubblica**
- `./math`: `TAU, extent, resolveDomain, createLinearScale, createBandScale, linePath, areaPath, arcPath, polarToCartesian, createPieLayout, createStackLayout, linearRegression, downsample`.
- `./math/experimental`: i layout specifici per singolo chart.
- I vecchi nomi restano come wrapper deprecati nel barrel `geometry.ts` fino alla 2.0.
- Gli algoritmi portati da d3-shape (monotoneX, offset di stack) e LTTB sono attribuiti in `THIRD_PARTY_NOTICES`.

### 3.8 Theming

| Livello | Forma | Token |
|---|---|---|
| 1 Globale | `--mini-chart-*` | `color` (accento), `surface`, `foreground`, `muted`, `series-1..12`, `line-width` (px, non scala), `radius`, `font-family`, `label-size`, `label-weight`, `duration`, `stagger`, `easing` |
| 2 Semantico | `--mini-chart-*` | `positive`, `negative`, `neutral`, `success`, `warning`, `danger`, `track`, `grid`, `baseline`, `reference`, `crosshair`, `highlight`, `empty`, `point`, `gradient-1..3`, `dim-opacity`, `hover-brightness`, `focus-ring` |
| 3 Componente | `--mini-<chart>-<part>[-<prop>]` | es. `--mini-gauge-arc-width`, `--mini-progress-arc-width`, `--mini-radial-bar-ring-width`, `--mini-bullet-band-1..3`, `--mini-bullet-target`, `--mini-candlestick-wick-width`, `--mini-ohlc-tick-width`, `--mini-range-bar-fill`, `--mini-scatter-trend-line`, `--mini-area-fill-opacity-start/end` |
| Privato | `--_mc-*` | risolti una volta su `:host`, mai documentati. Quelli impostati solo a volte vengono dichiarati `initial` su `:host`, così un antenato con lo stesso nome non filtra nel grafico |

**Regole**
- **Naming:** i colori non hanno suffisso; i non-colori hanno un'unità (`-width`, `-opacity`, `-duration`…). Il segmento componente coincide con il nome `::part`. Le serie si chiamano `series-N`, mai `color-N`.
- **Lint `check-source` in CI:** vieta `var(--x)` senza prefisso `--mini-` o `--_mc-`, colori letterali nei fogli migrati, `!important` nello shadow DOM, `this.style` sull'host e `innerHTML`.
- **Precedenza:** attributo d'istanza (var privata su un nodo interno) > componente > semantico > globale > default.
- **JS e CSS:** il JS scrive solo `--_mc-*`; mai `fill`, `stroke` o `transition` inline.
- **Movimento:** le regole di movimento non toccano mai proprietà che codificano dati. Progress, gauge e radial-bar disegnano il valore come **geometria d'arco**, non con `stroke-dashoffset`.
- **`@property`:** mai sui token pubblici, perché un valore iniziale registrato rende irraggiungibile la catena di fallback. Pochi colori privati si registrano con `CSS.registerProperty` (idempotente, SSR-safe, `<color>`), così un valore pubblico non valido torna al default invece di disegnare nero.
- **`light-dark()`:** segue il `color-scheme` calcolato, non `prefers-color-scheme`. Non si forza su `:host`: lo dichiara la pagina oppure `themes/auto.css`.
- **Catene legacy per componente, mai globali:** in 1.x ogni componente ricade solo sui vecchi nomi che leggeva prima. Un token impostato per un grafico non deve ricolorarne altri. Esempio:

```css
/* foglio della win-loss, generato da theme/tokens.ts */
:host { --_mc-positive: var(--mini-chart-positive, var(--mini-chart-win-color, var(--mini-chart-bullish-color, var(--_mc-d-positive)))); }
/* foglio della candlestick */
:host { --_mc-positive: var(--mini-chart-positive, var(--mini-chart-bullish-color, var(--_mc-d-positive))); }
/* foglio base */
:host { --_mc-dur: var(--mini-chart-duration, 400ms); --_mc-stagger: var(--mini-chart-stagger, 300ms); }
@media (prefers-reduced-motion: reduce) { :host { --_mc-dur: 0ms; --_mc-stagger: 0ms; } }
:host([hidden]) { display: none; }
@media (forced-colors: active) { :host { --_mc-accent: CanvasText; --_mc-track: GrayText; --_mc-active: Highlight; } }
```

**Mappa dei token principali dal vecchio al nuovo.** In 1.x i vecchi nomi sono catene di fallback, in 2.x stanno nel foglio compat, in 3.0 vengono rimossi.

| Vecchio | Nuovo |
|---|---|
| `color-N` | `series-N` |
| `bullish-color`, `positive-color`, `win-color` | `positive` |
| `bearish-color`, `negative-color`, `loss-color` | `negative` |
| `tie-color`, `muted-color` | `neutral` |
| `safe-color`, `warn(ing)-color`, `danger-color` (gauge) | `success`, `warning`, `danger` |
| `danger-color` (target del bullet) | `--mini-bullet-target` |
| `track-color`, `track-bg` | `track` |
| `ref-color`, `ref-width` | `reference`, `reference-width` |
| `stroke-width` | `line-width` per le linee; `--mini-gauge-arc-width` e `--mini-progress-arc-width` per gli archi |
| `range-color`, `range-1..3` | `--mini-bullet-band-1..3` (bullet), `--mini-range-bar-fill` (range-bar) |
| `bar-opacity-inactive` | `dim-opacity` |
| `trend-color` (scatter) | `--mini-scatter-trend-line` |
| `point-fill` | `point` |
| `point-stroke` | `surface` |
| `fill`, `segment-color` | non più API pubblica: usare `series-N` o `::part` |
| `--primary`, `--surface` | non vengono più letti (dalla 1.4.2) |

**Altri pezzi del sistema**
- **Vocabolario `::part`:**
  - elementi: `svg plot line area bar point segment arc ring track band marker needle label reference-line crosshair baseline trend-line candle tick empty`;
  - modificatori: `positive negative neutral bullish bearish series-N zone-N ring-N first last min max active clipped`;
  - i nomi legacy restano fino alla 3.0.
- **Preset** in `./themes/*.css`: `light`, `dark`, `auto` (imposta `color-scheme`), `high-contrast`, `okabe-ito`, `accessible` (≥3:1 su #fff e #0f172a, separazione CVD verificata), `classic` (2.0).
- **API JS opzionale** (`./theme`): `themeToCSS`, `applyTheme`, `MiniChartCSSProperties` e un elemento `<mini-chart-theme>` con `display:contents`, da cui si generano i provider per i framework.

### 3.9 Multi-framework

**Output del codegen.** Si lancia con `pnpm codegen`; i file generati sono committati e la CI esegue `--check`. Produce:
- CEM e campo `customElements` in package.json;
- `elements.d.ts` (HTMLElementTagNameMap più mappe eventi);
- JSX per React 19, Preact e Solid; `SvelteHTMLElements`; `GlobalComponents` di Vue;
- dati IDE per VS Code e web-types per JetBrains;
- tabelle docs, `tokens.json`, `preupgrade.css`;
- esempi type-checked in tsx, vue, angular, svelte, solid e html;
- MIGRATION;
- sorgenti dei wrapper.

| Framework | Livello | Consegna | Note su SSR e binding |
|---|---|---|---|
| React 18.3/19 (Next) | 1 | `@sparkline-mini-charts/react` | Le prop standard passano intatte; le prop dello schema diventano proprietà in un layout effect; eventi via `addEventListener`. `data` viaggia come stringa JSON in SSR e nel render di idratazione, perché React 19 SSR scarta gli oggetti sui custom element. `'use client'`, subpath per chart, registrazione lazy |
| Vue 3.5 (Nuxt) | 1 | `@sparkline-mini-charts/vue` | `PropType<T>`, emits tipizzati, `.prop` in `h()`; `data` come stringa JSON in SSR, perché i non primitivi vengono scartati; `isSparklineElement` per `isCustomElement` |
| Angular 20-22 | 1 | `@sparkline-mini-charts/angular` | Standalone, input signal tipizzati, nessun `effect()`. Host binding `[attr.x]` per i primitivi (Angular SSR li serializza) e property binding per `data`. Se lo schema DOM rifiuta l'host binding, fallback `ElementRef` + `afterRenderEffect`. `provideSparklineCharts()` |
| Svelte 5, Solid, Preact, Lit | 2 | tipi e ricette | Elemento raw con proprietà tipizzate |
| Qwik, Astro | 3 | ricette (fixture per Astro) | API ad attributi più script client di registrazione |

**Versioni:** gli adapter hanno il core come peer (`^1.8.0` e successive). `static version` emette un warning se nella stessa pagina convivono due versioni del core.

### 3.10 Toolchain

| Ambito | Scelta |
|---|---|
| TypeScript | strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`. `isolatedDeclarations` è incompatibile con `allowJs`, quindi finché JS e TS convivono servono project references: un progetto TS con `isolatedDeclarations` e un progetto legacy JS con `allowJs` + `checkJs`. TS 7 nativo per il typecheck; i d.ts si emettono con l'alias `@typescript/typescript6` fino a tsdown. `packages/angular` fissa la versione di TS supportata da Angular 20 |
| Build | 1.x: Vite 8 con stub d.ts per entry. Da 1.12: tsdown per core, react e vue; ng-packagr per angular. Target `es2022`. `sideEffects` include sempre `**/*.css`, `./dist/register.js` e le foglie `**/define.js` |
| Modalità dev | Condizioni di export `development`/`production`, più `globalThis.SPARKLINE_DEV ?? (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production')`. Senza la guardia su `typeof process`, l'uso senza bundler (import map, CDN) lancerebbe un errore |
| Qualità | Biome, knip, simple-git-hooks + lint-staged, Renovate, `check-source.mjs`, `eslint-plugin-compat`/Baseline sul dist |
| Test | Vitest con `test.projects` in `vitest.config.ts` (`vitest.workspace.ts` è deprecato). Progetti: `node` (math, data, codegen, golden di computeModel, fast-check), `dom` (happy-dom, suite di contratto generata) e `browser` (Playwright su Chromium, Firefox e WebKit). In aggiunta: baseline visive in Docker, axe, coverage V8, test di tipo, size-limit, publint e attw, api-extractor, fixture installate da tarball, benchmark e test di leak |
| CI | GitHub Actions: action pinnate per SHA, `permissions` minime, `id-token: write` solo nel job di release dietro un environment protetto, concurrency |
| Release | Changesets (gruppo `fixed`), trusted publishing OIDC con provenance, tag e GitHub Release automatici, pre mode `next` per la 2.0, `prepack` che builda sempre |
| Policy | In CONTRIBUTING. API pubblica = tag, attributi, proprietà, eventi e chiavi del detail, part, token, export. Si depreca in una minor (warning dev + `removeIn`) e si rompe solo in una major. La CI blocca le deprecazioni scadute |

### 3.11 Punti di aggancio dello strangler

| Seam | Introdotto | Cosa vi si aggancia |
|---|---|---|
| hook `parseData(raw)` | 1.4.1 | i normalizzatori (1.9) |
| `#safeRender` | 1.4.1 | lo scheduler (1.10) |
| `installProperties(Class, schema)` | 1.6 | gli accessor di `ChartElement` |
| `this.option(name)` | 1.6 | i converter e il compat della 2.x |
| doppio dispatch degli eventi | 1.6 | gli eventi legacy nel compat |
| barrel `geometry.ts` | 1.9 | i moduli `math/*` |
| catene di token per componente | 1.10 | il foglio compat della 2.x |
| `defineMiniCharts({ legacy: [...] })` | 1.10-1.11 | via d'uscita (escape hatch) per una minor dopo ogni migrazione |
| `resolveOptions()` + store del registry | 1.6 | `ChartElement` (1.10), il compat 2.x, l'SSR in 2.1 |
| `DefineMiniChartsOptions` | 1.6 | `legacy` (P7-1), `prefix` (P9-2), `compat` (P10-1) |

### 3.12 Configurazione per chart (1.6; nel CEM in 1.7, nei wrapper in 1.8)

**Situazione attuale**
- Le opzioni sono 93 attributi in 17 componenti, e oltre due terzi non sono documentati.
- I default sono scritti nel punto in cui si leggono, in 5 modi diversi: `getAttribute(x) || "d"`, `!== "false"`, `hasAttribute`, posizione nei dati, fallback CSS.
- Chart simili hanno default diversi:
  - `points`: `last` nella line, `none` nella area;
  - `gap`: 0.2 nella bar, 0.25 nella range-bar;
  - `radius`: 0, 2 o 3 secondo il chart.
- Nessun default si può leggere o sovrascrivere dall'esterno.

**Principio.** La configurazione si appoggia su `ChartSchema<M, O>` (§3.2): **`O` è il tipo delle opzioni**, quindi nulla viene dichiarato due volte. `PropDescriptor` guadagna solo due campi: `instanceOnly?` (per esempio `data` e `label`, vietate nei default) e `css?: '--_mc-x'` (D17). `options` e `preset` diventano chiavi riservate, controllate dalla guardia di P3-1, che copre anche i nomi alias.

```ts
// istanza (P3-8)
el.curve = 'smooth';                          // livello esplicito (proprietà); undefined/null lo cancella
el.options = { curve: 'smooth', markers: 'none' };   // si sostituisce solo, copia shallow congelata, mai riflessa
el.preset = 'compact dense';                  // riflesso come attributo preset="…"; vince il nome più a destra
el.resolvedOptions();                         // Readonly<O> dopo tutti i livelli
el.optionSource('curve');                     // 'attribute' | 'property' | 'options' | 'data' | `preset:${name}` | 'defaults' | 'schema' | 'token'

// registry (P3-9): un solo oggetto tipizzato
defineMiniCharts({
  registry: customElements, reflectData: false,
  defaults: { '*': { motion: 'reduce' }, 'mini-line-chart': { curve: 'smooth' } },
  presets:  { compact: { 'mini-line-chart': { markers: 'none' }, 'mini-bar-chart': { gap: 0.1 } } },
});
defineMiniCharts(customElements);             // la forma posizionale 1.x resta valida
configureMiniCharts({ defaults: { 'mini-bar-chart': { gap: 0.15 } } });   // a runtime: un render per chart connesso
defineChartPreset('dense', { 'mini-bar-chart': { gap: 0.05 } });
```

**Tipi generati** (P4-1, da `./types`): `MiniLineChartOptions` (= `O`), `ChartOptionsMap`, `ChartTag`, `ChartDefaults<T>`, `ChartPreset`, `DefineMiniChartsOptions`.

**Regole**
- **Alias:** si risolvono nel nome canonico dentro ogni livello, prima di unire i livelli. Se un livello contiene sia il canonico sia l'alias, vince il canonico e c'è un solo warning.
- **`'*'`:** accetta solo le prop comuni ai 17 schemi. I booleani a sola presenza sono vietati nei default, perché dall'HTML non si potrebbero più spegnere: per questo P3-4 introduce `interaction="none|hover|select"` (`interactive` resta come alias di `hover`). `locale` è ammesso in `'*'` solo da quando P7-4 lo consuma.
- **Esclusioni:** le prop `instanceOnly` e `css` sono rifiutate in `defaults` e `presets` (errore di tipo + warning che indica il token da usare).
- **Validazione (P3-10, solo in dev):** stessi converter degli attributi. `defaults` e `presets` si validano subito, alla chiamata. Attributi e chiavi sconosciuti producono `warnOnce` con un suggerimento did-you-mean. Allowlist: attributi globali, `aria-*`, `data-*`, artefatti di Angular/Vue/Astro. Avrebbe intercettato `endpoint="last"` nella demo.
- **Store:** `WeakMap<CustomElementRegistry, Store>` più una chiave globale per l'SSR, indipendente dall'ordine di registrazione (il wrapper React registra all'import, Angular nel costruttore). Il registry si cerca in quest'ordine: `this.customElementRegistry` → `ownerDocument.defaultView.customElements` → `globalThis.customElements`.
- **Peso:** strato options ≤ 1 KB min+gz. I suggerimenti per la UI non entrano nello schema runtime: stanno in `<tag>.docs.ts`.
- **Default incoerenti:** in 1.x lo schema registra fedelmente i default attuali. L'armonizzazione (`points`, `gap`, `radius`, `curve`) è un flip di P10-2.

**Wrapper (P5-1 esteso)**
- Passano `options` come `el.options` (livello 2) e le prop esplicite come proprietà (livello 1). Non assegnano mai un nome alias come proprietà.
- In SSR canonicalizzano le chiavi tramite la tabella alias e appiattiscono in attributi; json e colorList diventano stringhe JSON.
- Il `preset` di default per un sottoalbero passa da un context React, un `provide` Vue o `provideSparklineCharts({ defaults, presets })` in Angular.

### 3.13 Sito docs + demo (`apps/docs`, 1.7-1.12)

**Stato della demo attuale.** Un `index.html` di 3.402 righe (1.203 di CSS inline) e un `app.js` di 1.442 righe, entrambi scritti a mano.
- Router hash, dizionario i18n, catalogo di 17 chart con 68 stringhe di snippet, streaming, theming lab, gradients studio, playground.
- **Nulla è generato.** 41 delle 93 opzioni non compaiono da nessuna parte; un attributo usato (`endpoint`) non esiste; 4 token pubblicizzati non fanno nulla.
- **Dev e produzione eseguono build diversi:** in produzione l'import di `src` viene eliminato dal tree-shaking a causa di `sideEffects`, e gira un dist copiato.
- **Bug confermati:** chiamata a `initApp` non definito, handler `.tab-btn` globale, preset che si resettano, playground che sovrascrive la label.
- **Prestazioni:** 46 chart montati all'avvio e uno streaming che aggiorna 17 chart su ogni route e anche in background.
- **Accessibilità:** tab senza ARIA, drawer senza gestione del focus, autoplay ignora reduced motion, overflow orizzontale su mobile, 5 preset sotto 3:1.

**Stack e principi**
- **Struttura:** Astro + Starlight in `apps/docs`, pacchetto workspace privato.
- **Libreria:** consumata tramite gli `exports` (dist) sia in dev sia in build, mai da `src`.
- **Dogfooding:** preset e token, API di configurazione (P3-8), template degli esempi (P4-3), wrapper (P5).
- **Contenuti:** nessuna tabella API né snippet scritti a mano. Le fonti sono `chart-meta.json` (superset del CEM generato da `tools/codegen`, non pubblicato), gli esempi di P4-3 e `tokens.json`.
- **JavaScript:** zero di default; lo usano solo le 3 isole (D15) e lo script di registrazione.
- **Dati ai chart nei template Astro:** sempre `data={JSON.stringify(x)}` oppure assegnati come proprietà nello script dell'isola. Astro serializza con `String()`, e un oggetto diventerebbe `[object Object]`; un test sul build lo vieta.

**Mappa del sito**

| Path | Contenuto | Fase |
|---|---|---|
| `/` | splash con chart live in contesti reali (riga KPI, card, tile), installazione con tab, percorso in 3 passi | P4-5 |
| `/getting-started/*`, `/frameworks/*` | guide e ricette per framework (livelli di §3.9) | P4-5 → P5-4 |
| `/charts/`, `/charts/<slug>/` ×17 | gallery per categoria e pagine generate; configuratore da P5-5 | P4-6, P5-5 |
| `/guides/configuration/` | precedenza D16, esempi HTML/JS (tab dei wrapper da P5-1) | P4-6 → P5-1 |
| `/guides/{data,events,accessibility}/` | normalizzatori e `DataIssue`, contratto eventi, a11y | P6-10, P4-6, P9-3 |
| `/playground/` | configuratore a tutto schermo | P5-5 |
| `/live/` | board di dati live | P5-6 |
| `/theming/*` | fino a P7-2 solo token davvero consumati e precedenza reale; guida ai livelli da P7-2 | P4-6, P7-2 |
| `/theming/studio/` | theme studio | P8-9 |
| `/reference/*`, `/guides/migration-2-0/`, `/changelog/` | reference generata, migrazione | P4-6 → P9-3 |

**Pagina chart (componente `ChartPage`, ordine fisso)**
1. Header: nome, tag, categoria, `since`, peso gzip.
2. Preview e configuratore. Il primo stato è sempre quello **di default**, senza personalizzazioni.
3. Import per framework.
4. Forma dei dati e tipo TS.
5. Esempi.
6. Tabelle di prop, eventi, part e token.
7. Accessibilità e tastiera.
8. Edge case live.
9. Deprecazioni.
10. Correlati.

**Configuratore (`<smc-configurator tag mode="embedded|playground">`)**
- **Un solo elemento in anteprima**, aggiornato con `el.options = diff` e `el.data`. L'inspector mostra `resolvedOptions()` e `optionSource()`.
- **Controlli per `PropType`:**
  - number con limiti: slider + input;
  - number senza limiti: input + switch "auto";
  - boolean: switch con stato "non impostato";
  - enum: radio segmentati fino a 4 valori, poi select;
  - angle: slider -360…360;
  - json: editor con errori inline;
  - colorList: lista di stop con picker, campo testo, `CSS.supports`, pulsanti accessibili.
- **Struttura:** controlli raggruppati in `fieldset` per `group` (da `docs.ts`); "modificato" scritto in testo; reset per singolo controllo e globale.
- **Pannelli:** Data (JSON/CSV, generatori per normalizzatore, esempi come preset), Token (solo token consumati), Eventi (`role=log`, 50 voci), Inspector, Codice.
- **Codice:** template isomorfi di P4-3, con solo i valori modificati. Nella vista live non c'è syntax highlighting, oppure un highlighter minimo dentro il budget.
- **URL:** `?v=<versione schema>&o=…&t=…&d=…&fw=…`, compresso con `CompressionStream('deflate-raw')` + base64url.
  - Alla decodifica le chiavi vecchie vengono mappate tramite le tabelle alias.
  - Se lo stato viene troncato, un avviso è visibile.
  - I valori di token con `url(`, `image(` o `@import` sono rifiutati.
- **Accessibilità e peso:** label native, `aria-describedby`, tutto da tastiera, copia annunciata via `role=status`; ≤ 25 KB gz.

**Design system del sito**
- **Fino a P8-7:** il chrome usa la paletta di Starlight (che ha già light e dark). Solo gli stage dei chart sono temizzati, con una classe con scope che imposta i token legacy per schema colore: è l'unico file del sito autorizzato a dichiarare `--mini-chart-*` fino a P8-7.
- **Da P8-7:** `site-bridge.css` ricava `--sl-color-*` dai token di livello 1 e 2 con `color-mix(in oklab, …)`. Cambiare preset ricolora insieme chrome e chart: è la prova che i token bastano per una UI reale.
- **Modalità:** si usa il ThemeSelect di Starlight, senza script propri. I preset della libreria si importano senza la dichiarazione `color-scheme` di `auto.css` (in un cascade layer più basso), e un test Playwright verifica che cambiare tema cambi i colori dei chart.
- **Preset showcase:** ocean, emerald, cyberpunk, sunset e velvet diventano **privati del sito** in `apps/docs/src/themes/showcase/`, quindi senza vincoli semver, verificati da palette-check.
- **Scale, font e icone:** scale di Starlight, un solo font variabile self-hosted (Fontsource), icone Starlight, niente emoji nella chrome, transizioni azzerate con reduced motion.

**Redirect dalla demo legacy.** Uno shim inline su `/` usa `location.replace`, perché gli hash non arrivano al server:
- `#/overview` → `/`;
- `#/streaming` → `/live/`;
- `#/components` → `/charts/`;
- `#/components/mini-x-chart` → `/charts/x/`;
- `#/playground` → `/playground/`;
- `#/theming` → `/theming/` (poi `/theming/studio/`);
- `#/gradients` → `/theming/gradients/`;
- `#/frameworks` → `/frameworks/`.

**Deploy e SEO**
- **Prima del cutover:** `apps/docs` gira su un secondo progetto Vercel, con un'anteprima per ogni PR e il sottodominio `next.`, entrambi con `X-Robots-Tag: noindex`.
- **Al cutover (P5-6):** il dominio passa ad `apps/docs`.
- **SEO:** sitemap (Starlight con `site`), URL canonici, meta description da `docs.ts`, immagine OG.

---

## 4. Backlog

**Convenzioni**
- Taglie: **S** ≤ 1 giorno, **M** 2-4 giorni, **L** 1-2 settimane, sempre di lavoro concentrato.
- `[rinviabile 2.1]` segna la linea di taglio.
- Limite WIP: **una famiglia alla volta** in P7 e P8.
- Ogni item è una PR rilasciabile.
- I `test.todo` della rete di sicurezza diventano test reali con gli item che risolvono il relativo bug.

| Fase | Versione | Obiettivo | Item | Stima (giorni) |
|---|---|---|---|---|
| P0 | 1.4.1 | CI verde + hotfix critici | 12 (7S 5M) | 15-25 |
| P1 | 1.4.2 | fix high senza cambi di API + pipeline di rilascio + hotfix della demo legacy | 19 (11S 8M) | 26-40 |
| P2 | 1.5.0 | workspace, toolchain, test reali, benchmark, Angular AOT | 7 (7M) | 16-24 |
| P3 | 1.6.0 | contratto runtime: schema, proprietà, alias, eventi + **configurazione per chart** | 11 (2L 8M 1S) | 33-50 |
| P4 | 1.7.0 | contratto pubblicato: codegen, tipi, esempi, fixture raw + **scheletro del sito e pagine generate** | 6 (4L 1M 1S) | 27-42 |
| P5 | 1.8.0 | wrapper generati + pacchetti scoped + matrice adapter + **configuratore e cutover del sito** | 7 (2L 4M 1S) | 21-35 |
| P6 | 1.9.0 | modello dati + math v2 | 10 (2L 4M 4S) | 25-31 |
| P7 | 1.10.0 | nuovo runtime + financial, cartesian, stacked/combo | 7 (5L 2M) | 35-45 |
| P8 | 1.11.0 | famiglie restanti + theming completo + **theme studio** | 9 (1L 6M 2S) | 23-31 |
| P9 | 1.12.0 | ritiro del legacy, TS completo, chiusura del sito | 3 (3M) | 9-13 |
| P10 | 2.0.0 | flip dei default e rimozioni | 6 (2M 4S) | 7-10 |
| | | **Totale** | **97 (31S 50M 16L)** | **circa 235-345** |

**Come leggere le stime**
- Il totale corrisponde a circa 12-15 mesi a tempo pieno, oppure 17-27 mesi part-time.
- **Il valore per gli utenti è concentrato in P0-P5** (circa 140-215 giorni): tutti i critical, la maggior parte degli high, Angular AOT, proprietà ed eventi tipizzati, configurazione per chart, tipi e CEM, wrapper generati, prove da tarball, sito nuovo con configuratore.
- **Il sito non sta sul percorso di rilascio npm:** un item del sito può slittare di una minor senza bloccare la libreria. Anche P3-8…P3-11 possono uscire in 1.7.0, purché arrivino prima di P4-1 e di P5-1.
- P6-P9 sono la coda della ristrutturazione interna.
- Si può fermare il lavoro dopo qualunque minor senza lasciare main in uno stato misto.

### P0 · 1.4.1 · Stabilizzare: main verde e hotfix critici

- **Obiettivo:** main verde da clone pulito, rete di test sul ciclo di vita, una patch che chiude i critical senza cambiare l'API. Angular AOT fa eccezione e arriva con P2-7.
- **Uscita:** CI verde da clone pulito; check a, b, c, f, g verdi su 17 tag; test React 18.3/19 e Vue verdi; attw senza "missing types"; 1.4.1 pubblicata da `prepack`; tag v1.4.0 (retroattivo) e v1.4.1.
- **Ordine:** P0-1 → P0-3 → P0-4 → P0-5…P0-9 → P0-10, P0-11, P0-12; P0-2 in parallelo. Se serve uscire prima, la 1.4.1 parte dopo P0-4…P0-8 + P0-11, e il resto passa alla 1.4.2.

- [ ] **P0-1 · CI: ordine corretto, test unit e package separati, deploy solo da main** · S · dip. —
  - Cosa:
    - spostare il blocco adapter che importa `dist/` (test/components.test.js:386-411) in `test/package-dist.test.js`;
    - script `test:unit` (solo src) e `test:package` (dopo il build);
    - ordine in `.forgejo/workflows/ci.yaml`: install → typecheck → test:unit → build → test:package → build:demo;
    - `concurrency`, deploy solo da `refs/heads/main`, via il dump `ls -la /deploy`.
    - Nessun lavoro sullo swap atomico: D3 ritira il deploy self-hosted.
  - File: package.json, test/components.test.js, test/package-dist.test.js, .forgejo/workflows/ci.yaml
  - Fatto quando: `git clean -xdf && pnpm i --frozen-lockfile && pnpm test:unit` passa senza dist; un push su un feature branch non fa deploy.
  - Finding: packaging-4, adapters-13 (parz.), packaging-8 (parz.)

- [ ] **P0-2 · GitHub Actions canonica e CI sicura** · S · dip. P0-1
  - Cosa:
    - `.github/workflows/ci.yml` su PR e su push a main: `pnpm/action-setup`, cache dello store, matrice Node 22/24, stessi step di P0-1 senza deploy;
    - action pinnate per SHA, `permissions: contents: read`;
    - branch protection su main;
    - CONTRIBUTING breve: GitHub è canonico, Forgejo è un mirror.
  - File: .github/workflows/ci.yml, CONTRIBUTING.md
  - Fatto quando: una PR mostra check obbligatori e il merge resta bloccato finché non sono verdi.
  - Finding: packaging-8

- [ ] **P0-3 · Rete di sicurezza sul ciclo di vita dei 17 tag (happy-dom)** · M · dip. P0-1
  - Cosa: happy-dom e `test/contract/lifecycle.test.js`, table-driven sui tag di `src/define.js`. Check:
    - (a) `el.data = array` produce le stesse part di `setAttribute('data', JSON)`;
    - (b) idem con `el.data = stringa JSON`;
    - (c) una proprietà impostata prima di `define` sopravvive all'upgrade (serve una **Window happy-dom nuova per ogni caso**, perché `define` funziona una sola volta per tag);
    - (d) l'upgrade di un elemento già nel documento produce esattamente 1 render;
    - (e) connect → disconnect → connect, poi un pointer event, emette ancora `sparkline-hover` (con stub di `getBoundingClientRect`/`getScreenCTM`; per line, area e combo resta todo fino al browser mode);
    - (f) `null`, `[null]`, `[[1,2],null]`, `"abc"`, `{}` e `42` non lanciano;
    - (g) nessun prototipo di sottoclasse possiede un descriptor `data`.
  - Fatto quando: gira dentro `test:unit` in meno di 10 s; a, b, c, f, g falliscono su 5a9322d e passano dopo P0-4/P0-5; (d) ed (e) partono come `test.todo`.
  - Finding: core-25 (parz.), packaging-9 (parz.)

- [ ] **P0-4 · Un solo accessor `data` nella base + hook `parseData()`** · M · dip. P0-3
  - Cosa: `src/core/mini-chart-element.js` contiene l'unica coppia get/set.
    - Getter: `this.parseData(this.getAttribute('data'))`.
    - Setter:
      - stringa → `setAttribute` senza modifiche (niente doppia codifica);
      - `null` o `undefined` → `removeAttribute`;
      - altro → `JSON.stringify`. La riflessione resta, come promette README.md:37.
    - I 9 override di solo getter diventano `parseData(raw)`: bullet:69, candlestick:69, combo:79, ohlc:61, radial-bar:78, range-bar:68, scatter:70, stacked-area:74, stream:73.
    - Lazy upgrade della proprietà `data` in `connectedCallback`.
  - File: src/core/mini-chart-element.js, 9 file in src/components/
  - Fatto quando: check a, b, c, g verdi su 17 tag; l'assegnazione in strict mode non lancia su nessuna classe.
  - Finding: core-1, adapters-2, components-bars-financial-1, components-cartesian-1, data-api-1, packaging-1, components-bars-financial-19, components-bars-financial-20, core-7 (parz.), adapters-19 (parz.)

- [ ] **P0-5 · Parsing sicuro con `null`, dati posizionali, error boundary** · M · dip. P0-4
  - Cosa:
    - range-bar e scatter: `parseData` scarta gli elementi che non sono né oggetti né array.
    - bullet: un numero diventa `{value}` e `null` diventa modello vuoto; gli attributi target/min/max/ranges si applicano anche ai numeri.
    - gauge e progress: `parseData` **senza filtro**; un null resta nella sua posizione e ricade sull'attributo o sul default, così value, min e max non scorrono.
    - pie e half-pie: un null diventa 0 nella sua posizione, così i colori restano allineati.
    - Label di default calcolate sui dati già parsati.
    - `#safeRender()` con try/catch: un solo `console.error` per elemento e stato vuoto accessibile.
  - File: src/components/mini-{range-bar,scatter,bullet,gauge,progress,pie,half-pie}-chart.js, src/core/mini-chart-element.js
  - Fatto quando:
    - check f verde;
    - bullet `data="42" target="80"`: aria-valuenow 42 e target disegnato;
    - gauge `[null,0,50]` mantiene min 0 e max 50;
    - un render che lancia apposta logga una volta sola.
  - Finding: core-9, components-bars-financial-2, components-cartesian-3, data-api-2, data-api-3 (parz.), components-bars-financial-9 (parz.), components-radial-7 (parz.)

- [ ] **P0-6 · Reduced motion che non altera i dati + `:host([hidden])`** · S · dip. P0-3
  - Cosa:
    - in src/core/svg.js:55-62 togliere `stroke-dashoffset: 0 !important`;
    - aggiungere `transition-delay: 0s !important; animation-delay: 0s !important`;
    - aggiungere `:host([hidden]){display:none}`.
  - File: src/core/svg.js, test/contract/styles.test.js
  - Fatto quando: un test statico garantisce che il blocco reduced motion non contenga proprietà che codificano dati (stroke-dashoffset, d, width, height, r); in Chrome, con reduced motion emulato, il progress al 30% mostra 30%.
  - Finding: core-2, theming-1, core-18, theming-18 (parz.)

- [ ] **P0-7 · Wrapper React: prop intatte, dati ed eventi consegnati** · M · dip. P0-4
  - Cosa: in `src/react/index.ts`.
    - Allowlist per tag, ricavata da `observedAttributes`; si convertono solo quelle chiavi. Passano intatte: `style`, `className`, `id`, `slot`, `tabIndex`, `aria-*`, `data-*`, `children`.
    - `data` resta stringa JSON: con P0-4 è corretta in React 18 e 19, e React 19 SSR la serializza.
    - Le opzioni oggetto vengono serializzate in JSON.
    - Eventi `onSparklineHover/Leave/Select/ZoneChange/ProgressComplete` agganciati con `addEventListener` tramite un ref unito al ref inoltrato.
    - Flag default-true: `undefined` → nessun attributo, `true` → `""`, `false` → `'false'`.
    - `normalize` passa sempre come attributo (`ref.setAttribute`), perché come proprietà oscurerebbe `Node.prototype.normalize`.
    - Banner `'use client'` su `dist/react.*`.
  - File: src/react/index.ts, vite.config.js (banner), package.json (react-dom + alias 18.3), test/adapters/react.test.tsx
  - Fatto quando, su React 18.3 e su 19:
    - lo `style` con `--mini-chart-color` viene applicato;
    - `className` diventa l'attributo class;
    - un array in `data` rende N punti;
    - `onSparklineHover` scatta una volta per evento;
    - `roundCaps={false}` produce `round-caps="false"`;
    - `normalize` funziona;
    - `renderToString` contiene `data`;
    - il file buildato inizia con `'use client'`.
  - Finding: adapters-1, adapters-4, adapters-5 (parz.), adapters-14, components-cartesian-2, packaging-2, packaging-21, theming-2, adapters-7 (parz.)

- [ ] **P0-8 · Wrapper Vue** · S · dip. P0-4
  - Cosa: in `src/vue/index.ts`.
    - `data` resta stringa JSON (Vue la assegna alla proprietà; in SSR un array verrebbe scartato).
    - Le altre opzioni oggetto o array vengono serializzate in JSON; oggi diventano `"[object Object]"`.
    - Booleani: un `false` sui flag **solo-presenza** (`interactive`, `normalize`, `show-value`, `trend-line`) **omette l'attributo**, perché Vue scriverebbe `"false"` e accenderebbe la funzione. Solo i flag default-true ricevono `'false'`.
    - `normalize` forzato ad attributo (chiave `^normalize`).
    - `inheritAttrs:false`.
    - Emits: aggiungere `sparkline-select` e `progress-complete`.
  - File: src/vue/index.ts, test/adapters/vue.test.ts (@vue/test-utils + @vue/server-renderer)
  - Fatto quando: `:data="[1,2,3]"` rende 3 punti; `:normalize="false"` rende un grafico non normalizzato; `:zones` arriva come JSON; l'HTML SSR contiene `data="[1,2,3]"`.
  - Finding: adapters-1, packaging-2, adapters-9 (parz.), adapters-21 (parz.), adapters-7 (parz.)

- [ ] **P0-9 · Angular ad interim: ripristinare la direttiva catch-all `@Input()` della 1.3.0** · M · dip. P0-4
  - Cosa:
    - `MiniChartDirective` torna a usare i decoratori `@Input()` e la registrazione (`defineMiniCharts()`) della v1.3.0: `git show v1.3.0:src/angular/mini-chart.directive.ts`. È l'unica forma che funziona in JIT quando il codice arriva da node_modules.
    - Le 17 direttive per chart con `input()`/`effect()` non funzionano da node_modules né in AOT né in JIT. Vengono documentate come tali fino a P2-7.
    - Ricetta AOT sicura: `import 'sparkline-mini-charts/register'` + `CUSTOM_ELEMENTS_SCHEMA` + `[data]` sui tag raw (funziona dopo P0-4).
    - CHANGELOG preciso: cosa è stato ripristinato e cosa no.
  - File: src/angular/mini-chart.directive.ts, README.md, docs/getting-started.md
  - Fatto quando: una fixture JIT locale, senza `CUSTOM_ELEMENTS_SCHEMA`, rende con `[data]`; la ricetta AOT rende su Angular 20.
  - Finding: adapters-6 (parz.), packaging-7 (parz.), adapters-7 (parz.)

- [ ] **P0-10 · Snippet corretti e affermazioni false rimosse** · S · dip. P0-7, P0-8
  - Cosa:
    - `data={JSON.stringify(x)}` diventa un binding di proprietà;
    - "native bindings (Svelte)" diventa "funziona in Svelte tramite i custom element";
    - correggere gli snippet React/JSX sbagliati;
    - gli snippet Angular usano la ricetta di P0-9.
  - File: README.md, docs/getting-started.md:116-170, demo/index.html:3218-3331, demo/app.js:604,715
  - Fatto quando: un test grep non trova `JSON.stringify(` negli snippet per i framework.
  - Finding: adapters-12 (parz.), adapters-22 (parz.)

- [ ] **P0-11 · Igiene di rilascio** · S · dip. P0-1
  - Cosa:
    - `repository` e `bugs` puntano a github.com/ErlonRr;
    - `prepack: pnpm build` e `prepublishOnly`;
    - peer limitati: `react ^18.3.0 || ^19.0.0`, `vue ^3.5.0`, `@angular/core ^20 || ^21 || ^22`;
    - tag retroattivo `v1.4.0` su 5a9322d;
    - CHANGELOG: sezione Unreleased, link di confronto, la 1.3.1 annotata come confluita nella 1.4.0, nota sui breaking della 1.4.0;
    - il README rimanda al CHANGELOG.
    - **Azione tua:** creare l'org npm `@sparkline-mini-charts` (D1) e attivare la 2FA.
  - File: package.json, CHANGELOG.md, README.md
  - Fatto quando: `npm pack --dry-run` da clone pulito elenca dist/*.js e *.d.ts; esistono i tag v1.4.0 e v1.4.1.
  - Finding: packaging-6 (parz.), packaging-7 (parz.), packaging-16, packaging-15 (parz.), adapters-18 (parz.)

- [ ] **P0-12 · d.ts per ogni entry + publint/attw** · S (M se l'emissione d.ts è rotta) · dip. P0-1
  - Cosa:
    - Passo 0: `pnpm build && find dist -name '*.d.ts'`. Se vite-plugin-dts sotto TS 7 non emette, si anticipa qui l'emissione con TS 6 (`@typescript/typescript6/bin/tsc -p tsconfig.build.json`).
    - `scripts/emit-entry-dts.mjs` genera gli stub `dist/mini-*.d.ts` e `dist/math.d.ts`.
    - publint e `attw --pack` in CI; il problema "CJS che si maschera da ESM" finisce in un'allowlist documentata.
  - File: scripts/emit-entry-dts.mjs, package.json, workflow
  - Fatto quando: attw senza "missing types" per le 24 entry; una fixture TS che importa `sparkline-mini-charts/mini-line-chart` e `/math` compila con `node16` e con `bundler`.
  - Finding: packaging-5, geometry-22

### P1 · 1.4.2 · Fix high senza cambiare l'API + pipeline di rilascio

- **Obiettivo:** correggere i difetti di comportamento high che si risolvono dentro l'API esistente, poi automatizzare i rilasci.
- **Uscita:** zero `test.todo`; `check-source` e `check-docs` verdi; attw senza allowlist; 1.4.2 pubblicata da Changesets con provenance; deploy della demo solo da main con CI verde.

- [ ] **P1-1 · L'interazione sopravvive a disconnect e reconnect (17 componenti)** · M · dip. P0-3
  - Cosa: `cleanup()` annulla solo rAF e timer; via le chiamate a `#detachInteractionListeners()`. I listener stanno su nodi dello shadow root, quindi staccarli non evita alcun leak. Setup idempotente con `#listenersAttached`. Correggere docs/architecture.md:28.
  - Fatto quando: il check (e) è reale e verde su 17 tag.
  - Finding: core-3, components-cartesian-4, components-bars-financial-3, components-radial-1, data-api-11

- [ ] **P1-2 · Un solo render all'upgrade, animazioni d'ingresso ripristinate** · M · dip. P0-3
  - Cosa:
    - `#safeRender` salta il microtask accodato durante l'upgrade;
    - stati iniziali con booleani privati: in mini-progress-chart.js:277 il controllo dell'ingresso legge lo style inline ed è sempre falso;
    - bar: regola "primo render non vuoto";
    - progress: easing senza overshoot.
  - Fatto quando: il check (d) è reale; il progress anima da 100 al valore; la bar anima quando arrivano i primi dati dopo un render vuoto; l'arco vicino al 100% non sparisce.
  - Finding: core-4, components-radial-4, components-bars-financial-17 (parz.), components-radial-24

- [ ] **P1-3 · `progress-complete` e `zone-change` solo sulle transizioni** · S · dip. P1-2
  - File: mini-progress-chart.js:302-308, mini-gauge-chart.js:384-392
  - Fatto quando: la sequenza 50 → 100 → 50 → 100 produce 2 eventi; i re-render dovuti ad altri attributi non producono eventi.
  - Finding: components-radial-6

- [ ] **P1-4 · `trend-color` senza toccare lo style dell'host + `check-source.mjs`** · S · dip. P0-3
  - Cosa: line e area impostano `data-trend="up|down"` sul proprio svg interno e il colore passa dal CSS. Via tutti i `this.style.*`. `scripts/check-source.mjs` in CI vieta `this.style.` e `innerHTML` in src.
  - File: mini-line-chart.js:282-292, mini-area-chart.js:334-344, scripts/check-source.mjs
  - Fatto quando: un `--mini-chart-color` inline sull'host sopravvive a N render; un MutationObserver conferma che lo style dell'host non viene mai scritto.
  - Finding: core-5, components-cartesian-5, theming-3, data-api-12

- [ ] **P1-5 · Radial-bar rimuove gli anelli in eccesso** · S · dip. P0-3
  - File: mini-radial-bar-chart.js:253-372
  - Fatto quando: passando da [90,70,50,30] a [10,20] restano 2 gruppi.
  - Finding: core-10, components-radial-2, data-api-13

- [ ] **P1-6 · Parser di gradient condiviso; `gradient="false"` non annerisce più** · S · dip. P0-3
  - Cosa:
    - `src/core/gradient.js` con un tokenizer che rispetta le parentesi (rgb, oklch, var): `null`, `'false'` e `'0'` spengono il gradient; `''` e `'true'` lo accendono con gli stop di default (l'attributo senza valore e i wrapper con `true` producono `""`);
    - via le regole `:host([gradient])` in bullet:118-120 e progress:110-112;
    - usato da area, bullet, gauge, progress e radial-bar.
  - Fatto quando: `'rgb(255,0,0), blue'` produce 2 stop; con `gradient="false"` misura e arco mantengono il colore del tema.
  - Finding: theming-4, components-bars-financial-8, components-radial-3, components-cartesian-22, theming-13 (parz.)

- [ ] **P1-7 · Eliminare la dipendenza da `--primary` e `--surface`** · S · dip. P1-4
  - File: mini-bullet-chart.js:108-110, mini-scatter-chart.js:104,111
  - Fatto quando: check-source rifiuta i `var(--` senza prefisso `--mini-`; con `--primary: 222.2 47.4% 11.2%` su :root bande e trend line restano visibili.
  - Finding: theming-6, components-bars-financial-13, components-cartesian-12 (parz.), core-12 (parz.)

- [ ] **P1-8 · Attributi osservati reattivi, niente interpolazione nel CSS** · M · dip. P1-1
  - Cosa:
    - i valori validati diventano var private sullo svg interno (`--_mc-wick`, `--_mc-tick`, `--_mc-radius`), dichiarate `initial` su `:host`;
    - `hollow-bullish` e `round-caps` diventano data-attribute;
    - `needle-type` reattivo.
  - File: mini-candlestick-chart.js:102-110, mini-ohlc-chart.js:94-99, mini-range-bar-chart.js:98-106, mini-win-loss-chart.js:86-98, mini-radial-bar-chart.js:112-125, mini-gauge-chart.js:172-183
  - Fatto quando: cambiare questi attributi dopo il primo render cambia l'output; con `wick-width='1;} :host{display:none} x{'` il testo dei fogli resta identico.
  - Finding: components-bars-financial-4, core-15, theming-15, data-api-15, components-bars-financial-28, data-api-8 (parz.), components-radial-11 (parz.)

- [ ] **P1-9 · Accettare i valori enum e le forme dati documentati** · S · dip. P0-3
  - Cosa:
    - win-loss `mode`: `status`, più gli alias `uptime` e `binary`;
    - range-bar: `value` come alias di `current`, `low`/`high` come alias di `min`/`max`;
    - tipi React allineati per curve, points e mode.
  - File: mini-win-loss-chart.js:183-185, geometry.js:661-682, src/react/index.ts:51-52,172
  - Finding: components-bars-financial-7, components-bars-financial-11 (parz.), data-api-7 (parz.), components-cartesian-20 (parz.)

- [ ] **P1-10 · Correzioni geometriche e guardie, senza cambiare le firme ("Fixed (visual)")** · M · dip. P0-3
  - Cosa:
    1. Il dominio di candlestick/OHLC usa solo o/h/l/c.
    2. Combo: la linea sta sui centri delle bande, e l'hover usa la stessa scala.
    3. stacked/stream: null → 0 nella sua posizione, così le colonne restano allineate.
    4. Estensione calcolata in un solo passaggio, senza spread.
    5. min ≥ max → si usa l'estensione dei dati.
    6. Zone del gauge: limitate a [min, max], stringhe numeriche convertite, default di ripiego.
    7. Radial-bar: sweep limitato a (0, 360] e `max ≤ 0` sostituito dal default.
  - File: geometry.js:31-46,61,159-165,184-185,372,434,504-505,685-686,778-781, mini-combo-chart.js:274-285, mini-stacked-area-chart.js:74-84, mini-stream-chart.js:73-83, mini-gauge-chart.js, mini-radial-bar-chart.js
  - Fatto quando:
    - OHLCV e OHLC producono la stessa geometria;
    - con n=5 la linea combo passa sui centri delle barre;
    - `[[1,null,3],[2,2,2]]` impila il 3 all'indice 2;
    - 1e6 valori non lanciano;
    - `min=10 max=0` non capovolge il grafico;
    - una zona oltre max viene limitata.
  - Finding: geometry-1, geometry-2, geometry-9, components-cartesian-7, data-api-22, components-bars-financial-30, components-radial-13, data-api-5 (parz.), components-bars-financial-10 (parz.), components-cartesian-6 (parz.), geometry-5 (parz.), geometry-4 (parz.), components-radial-14 (parz.)

- [ ] **P1-11 · Puntatore → indice corretto con il letterboxing** · S · dip. P1-1
  - Cosa: line, area e combo usano `getScreenCTM().inverse()`, con fallback sul rect.
  - File: mini-line-chart.js:172-175, mini-area-chart.js:203-206, mini-combo-chart.js:181-184
  - Finding: components-cartesian-8

- [ ] **P1-12 · Stagger d'ingresso con durata totale limitata** · S · dip. P1-2
  - Cosa: `delay = i/n × 300ms` invece di un delay lineare nei 7 file con stagger. Oggi 365 barre impiegano circa 11 s.
  - File: mini-{bar,candlestick,ohlc,combo,radial-bar,range-bar,scatter,win-loss}-chart.js
  - Fatto quando: 365 barre completano l'ingresso entro 700 ms.
  - Finding: components-bars-financial-16, components-cartesian-15 (parz.)

- [ ] **P1-13 · Piccole correzioni di robustezza** · S · dip. P0-3
  - Cosa:
    - gauge vuoto: `aria-valuenow`/min/max rimossi dall'elemento che porta `role=meter`, cioè lo svg (oggi vengono tolti dall'host); testo del valore nascosto; la traccia viene disegnata anche con un gauge vuoto in partenza;
    - gli 11 `innerHTML = ""` diventano `replaceChildren()`, così il rendering non si rompe con Trusted Types.
  - Fatto quando: passare da `[72]` a `[]` rimuove testo e aria; check-source non trova `innerHTML`.
  - Finding: components-radial-12, data-api-23, components-radial-26 (parz.)

- [ ] **P1-14 · Revisione di verità delle docs + controllo di drift** · M · dip. P1-8, P1-9
  - Cosa:
    - correggere token, part, default e forme dati errati (combo, range-bar, gauge, candlestick/OHLC, scatter, bullet, `--mini-chart-color` vs `-color-N`, "Vitest" → node:test, demo-guide);
    - via i token inesistenti dalla demo;
    - `scripts/check-docs.mjs` confronta `var(--mini-…)` e i nomi di part estratti da src con le tabelle delle docs.
  - File: README.md, docs/**, demo/index.html, demo/app.js, scripts/check-docs.mjs
  - Finding: components-bars-financial-11, components-cartesian-9 (parz.), data-api-7 (parz.), theming-8 (parz.), packaging-15 (parz.), components-bars-financial-23 (parz.), components-radial-10 (parz.), components-radial-30 (parz.)

- [ ] **P1-15 · Dichiarazioni CJS corrette** · S · dip. P0-12
  - Cosa: copie `.d.cts`, condizioni annidate `import:{types,default}` / `require:{types,default}`, export `./package.json`, via l'allowlist.
  - Fatto quando: attw non segnala "masquerading as ESM".
  - Finding: packaging-13 (parz.), packaging-18 (parz.), packaging-20 (parz.)

- [ ] **P1-16 · Pipeline di rilascio: Changesets, provenance, politica semver, API report** · M · dip. P0-2, P0-11, P1-15
  - Cosa:
    - `changesets/action` in `.github/workflows/release.yml`, con `id-token: write` solo in quel job e dietro un environment protetto;
    - template di PR;
    - CONTRIBUTING: definizione di API pubblica e politica di deprecazione;
    - report api-extractor nella CI.
    - **Azione tua:** configurare il trusted publisher su npmjs.com.
  - Fatto quando: la 1.4.2 esce dal workflow con badge di provenance; una PR che rimuove un export fallisce.
  - Finding: packaging-6, packaging-7

- [ ] **P1-17 · Un solo host per la demo, deploy vincolato alla CI** · S · dip. P0-2
  - Cosa:
    - Vercel: preview per ogni PR, produzione da main;
    - via il job di deploy Forgejo;
    - vercel.json: togliere la rewrite catch-all e la regola di cache morta;
    - la demo carica solo dist;
    - `rollupOptions` → `rolldownOptions`.
  - File: vercel.json, vite.config.demo.js, demo/app.js:3, .forgejo/workflows/ci.yaml
  - Finding: packaging-8, packaging-23, packaging-19

**Demo legacy: da qui in poi solo hotfix (feature freeze, D13).** Le citazioni del codice qui sotto sono per simbolo, perché P0 sta modificando quei file. I finding `demo-arch-N`, `demo-ux-N`, `demo-a11y-N` e `chart-config-N` vengono dall'audit della demo.

- [ ] **P1-14 (esteso) · Verità della demo e controllo docs in entrambe le direzioni** · +S · dip. P1-8, P1-9
  - Cosa:
    - sulla board di theming, `endpoint="last"` diventa `points="last"`;
    - via `::part(point-last)` (non esiste), la promessa "eredita `currentColor`", "< 3 kB gzip", "SSR Safe" e "LIVE WEBSOCKET";
    - docs/demo-guide.md senza file inesistenti;
    - `check-docs.mjs` controlla **in entrambe le direzioni**: ogni attributo usato in demo e docs deve essere osservato, e ogni attributo osservato deve essere documentato in `docs/components/<tag>.md`.
  - Fatto quando: `check-docs` fallisce se si reintroduce `endpoint=` oppure se si aggiunge un attributo osservato non documentato.
  - Finding: demo-ux-5, demo-ux-12 (parz.), demo-a11y-15, demo-arch-3 (parz.), demo-arch-13, chart-config-1 (parz.), chart-config-5 (parz.)

- [ ] **P1-18 · Demo legacy: bug funzionali, flussi rotti, smoke Playwright** · M · dip. P1-17, P0-10
  - Cosa:
    - **Boot e stato:**
      - via il secondo boot che chiama `initApp`, mai definito: oggi lancia un ReferenceError a ogni caricamento;
      - `localStorage` dentro try/catch;
      - la gallery si ricostruisce solo se la vista è attiva.
    - **Tab:**
      - l'handler `.tab-btn` è legato al proprio contenitore invece che a tutto il documento;
      - i tab d'installazione ricevono pannelli reali (pnpm, npm, yarn, CDN);
      - il pill copia il comando del tab attivo.
    - **Playground:** la label digitata vince; nessun attributo duplicato; un JSON non valido mostra un errore inline; l'elemento si aggiorna invece di essere ricreato.
    - **Theming lab e gradients studio:**
      - il preset attivo sta in `state` e non si resetta;
      - `.preset-pill` agisce solo sul proprio gruppo;
      - lo slider `stroke-width` viene rimosso, perché scrive `--mini-chart-stroke-width`, che allarga anche gli archi di gauge e progress;
      - nuova opzione "Default (nessun tema)", che toglie gli override e mostra i default reali della libreria.
    - **Varie:**
      - helper `copy()` con toast d'errore al posto dei 7 `clipboard.writeText`;
      - una route con tag sconosciuto mostra "chart non trovato";
      - CSS: classi e variabili non definite sistemate, `margin-block-top` corretto;
      - versione letta da package.json; URL GitHub da una sola costante (`ErlonRr`).
    - **Smoke `@playwright/test`** sul `vite preview`: su 8 route console pulita, 17 tag definiti e almeno un chart nella vista. Gira in CI dopo "Build demo".
  - File: demo/app.js, demo/index.html, vite.config.demo.js, package.json, playwright.config.ts, test/e2e/demo-smoke.spec.ts, .github/workflows/ci.yml
  - Fatto quando:
    - lo smoke diventa rosso se si reintroduce `initApp`;
    - cliccare "npm" non cambia i tab di `#/frameworks`;
    - dopo un preset e uno slider il preset resta;
    - la label digitata compare una sola volta nel markup;
    - con lo storage bloccato la demo si avvia.
  - Finding: demo-arch-5, demo-arch-6, demo-arch-8, demo-arch-9, demo-arch-10, demo-ux-6, demo-ux-13, demo-ux-17, demo-a11y-11, demo-a11y-20, chart-config-9, demo-arch-14 (parz.), demo-ux-2 (parz.), demo-ux-4 (parz.)

- [ ] **P1-19 · Demo legacy: solo i blocchi di accessibilità** · M · dip. P1-18
  - Cosa: si correggono solo i problemi che bloccano gli utenti, perché la pagina verrà eliminata al cutover.
    - **Reflow:** niente scroll orizzontale a 320 px (`minmax(min(100%,Npx),1fr)`, tabelle in un wrapper scorrevole, card senza altezza fissa); via `body{overflow-x:hidden}`.
    - **Drawer:** `aria-expanded`, `inert` quando è chiuso, chiusura con Esc, con il backdrop e alla navigazione, focus che torna al toggle.
    - **Movimento (WCAG 2.2.2):**
      - lo streaming gira solo su `#/streaming`, parte da solo solo con `prefers-reduced-motion: no-preference` e va in pausa con `document.hidden`;
      - badge testuale LIVE/PAUSED;
      - blocco reduced motion per le animazioni decorative.
    - **Form:** `<label for>`/`<output>` nel lab, `aria-invalid` sul JSON del playground, `role=status` sul toast, nome accessibile sui link icona, `html[lang]` aggiornato.
    - **Contrasto:**
      - 3 token del sito corretti;
      - nel lab, i preset Cyberpunk e Sunset rimossi oppure limitati al dark, perché sotto 3:1;
      - `hollow-bullish` sulla candlestick della board, come indizio non cromatico.
    - Fuori scope: pattern ARIA completo dei tab, i18n, restyling.
  - File: demo/index.html, demo/app.js, test/e2e/demo-a11y.spec.ts
  - Fatto quando:
    - axe a 0 violazioni serious o critical sulle 8 viste, in light e dark;
    - nessuno scroll orizzontale a 320 e 375 px;
    - il drawer chiuso non riceve il focus;
    - con reduced motion nessun chart cambia per 5 s;
    - in un tab nascosto le scritture di `data` restano a 0.
  - Finding: demo-a11y-1, demo-a11y-3, demo-a11y-4, demo-a11y-8, demo-a11y-9, demo-a11y-10, demo-a11y-12, demo-ux-3, demo-ux-14, demo-a11y-2 (parz.), demo-a11y-5 (parz.), demo-a11y-7 (parz.), demo-arch-7 (parz.)

### P2 · 1.5.0 · Fondamenta: workspace, toolchain, test reali, benchmark, Angular AOT

- **Uscita:** il workspace pubblica il core con file list ed exports invariati (compare-pack) e `@sparkline-mini-charts/angular`; fixture AOT verde; Vitest node, dom e browser verdi su 3 motori; baseline visive e benchmark committati; core in TS strict.

- [ ] **P2-1 · Workspace pnpm** · M · dip. P1-16, P1-17
  - Cosa:
    - `packages/core` (nome pubblicato invariato), `tools/scripts`, gruppo `fixed` di Changesets, `compare-pack.mjs` contro l'ultima versione pubblicata;
    - `demo/` si sposta in `apps/demo/` **cambiando solo import e config di build**: dipende da `sparkline-mini-charts: workspace:*` risolto tramite gli exports (dist) sia in dev sia in build;
    - via `demo-library-plugin`, via la copia dell'intero dist (1,5 MB tra .map, .cjs e .d.ts) e la regola `external` morta;
    - gli smoke di P1-18 e P1-19 seguono il nuovo path.
  - Fatto quando: compare-pack non mostra file o export rimossi; senza il dist del core, il build della demo fallisce con un errore esplicito invece di servire chart vuoti; il build della demo non contiene .map/.cjs/.d.ts della libreria.
  - Finding: demo-arch-1

- [ ] **P2-2 · Toolchain e igiene del repo** · M · dip. P2-1
  - Cosa:
    - TS: project references (TS con `isolatedDeclarations` + legacy JS con `allowJs`/`checkJs`), `tsconfig.json` noEmit separato da `tsconfig.build.json`, `build.target: es2022`, `experimentalDecorators` solo in angular;
    - minimo browser D8 verificato con `eslint-plugin-compat`/Baseline sul dist;
    - Biome, knip (rimuove le dipendenze inutilizzate), .editorconfig, `.nvmrc` + `devEngines` al posto di `engines`, hook, Renovate (anche per le action), SECURITY.md;
    - commenti solo in inglese.
  - Fatto quando: `pnpm lint typecheck` verde; knip pulito; il lint di compatibilità passa.
  - Finding: packaging-13, packaging-14, packaging-20, packaging-22

- [ ] **P2-3 · Piramide di test Vitest e id deterministici** · M · dip. P2-1
  - Cosa:
    - migrare i test a `test.projects`: node, dom, browser (Playwright su Chromium, Firefox e WebKit);
    - `Math.random` (11 componenti) sostituito da id locali statici;
    - test per createCandlestickLayout, createRadialBarLayout, describeArc, polarToCartesian;
    - i controlli manuali di P0-6, P1-6, P1-7 e P1-11 diventano test nel browser.
  - Fatto quando: reduced motion → dashoffset 70 sui 3 motori; `gradient="false"` dà il colore del tema; snapshot dello shadow DOM stabili.
  - Finding: core-25, components-cartesian-26, components-bars-financial-32, components-radial-31, packaging-17, core-23, theming-22, components-radial-27, components-cartesian-24, components-bars-financial-29, packaging-9 (parz.), geometry-21 (parz.)

- [ ] **P2-4 · Baseline visive, axe, coverage** · M · dip. P2-3
  - Cosa: Playwright `toHaveScreenshot` nell'immagine Docker, su 17 tag × {default, dark con `color-scheme: dark`, token custom} × {vuoto, singolo, negativo, normale}; axe; coverage V8 ≥ 85% sul core.
  - Finding: theming-24, packaging-9 (parz.)

- [ ] **P2-5 · Harness di benchmark e leak (baseline prima della riscrittura)** · M · dip. P2-3
  - Cosa:
    - mount di 200 e 1000 chart;
    - costo di un tick di streaming;
    - memoria dei chart staccati (garbage collection verificata con `FinalizationRegistry` nel browser);
    - verifica che i controller vengano abortiti al disconnect.
    - Soglie di regressione in CI da P7.
  - File: packages/core/test/bench/**, test/browser/leak.browser.test.ts
  - Finding: — (rete di sicurezza per P7-P8)

- [ ] **P2-6 · `src/core` in TypeScript strict** · M · dip. P2-2
  - Cosa: conversione senza `any` nelle firme pubbliche (`set data(value: unknown)`); componenti e geometria restano JS fino alle loro fasi.
  - Fatto quando: attw e API report invariati, salvo tipi più stretti.
  - Finding: — (abilitante)

- [ ] **P2-7 · `@sparkline-mini-charts/angular` con ng-packagr** · M · dip. P2-1, P0-9
  - Cosa:
    - APF con compilazione parziale contro Angular 20; peer ^20, ^21 e ^22; solo ESM;
    - port delle direttive per chart, più `provideSparklineCharts()`;
    - il subpath del core resta, deprecato, con un warning dev.
    - Bootstrap npm: primo publish manuale con `publishConfig: {access:'public', provenance:true}`, token granulare temporaneo e 2FA, poi configurazione del trusted publisher e revoca del token.
  - File: packages/angular/**, fixtures/angular-aot/**
  - Fatto quando: `ng build` AOT con strictTemplates passa su Angular 20 e sull'ultima major; il d.ts contiene `ɵɵDirectiveDeclaration`; TestBed rende `[data]`; la build SSR non va in crash.
  - Finding: adapters-3, packaging-3, adapters-6 (parz.), adapters-18 (parz.)

### P3 · 1.6.0 · Contratto runtime: schema, proprietà, alias, eventi

- **Uscita:** test di allineamento meta ↔ observedAttributes verde; ogni opzione impostabile come proprietà anche prima del define; ogni attributo osservato cambia l'output; alias equivalenti con un solo warning in dev; eventi uniformi in forma additiva; direttive Angular tipizzate.

- [ ] **P3-1 · Schema per chart + infrastruttura dev e deprecazioni** · L · dip. P2-6
  - Cosa:
    - `meta/<tag>.schema.ts` (runtime) e `<tag>.docs.ts` (prosa) per i 17 chart;
    - `core/dev.ts` (`warnOnce`, rilevamento dev di §3.10) e la tabella `deprecations.ts` vivono qui;
    - test meta ↔ `observedAttributes`;
    - scan statico: ogni evento dichiarato ha un punto di dispatch;
    - guardia: nessuna chiave in `HTMLElement.prototype`;
    - `tokens` elenca solo i token consumati.
  - Fatto quando: la CI fallisce in caso di drift; schemi sotto 2,5 KB.
  - Finding: packaging-10 (parz.), adapters-20 (parz.), core-16 (parz.)

- [ ] **P3-2 · Proprietà tipizzate per ogni opzione (`installProperties`)** · M · dip. P3-1
  - Cosa:
    - accessor camelCase per ogni opzione: i primitivi si riflettono, oggetti e array si salvano raw;
    - upgrade delle proprietà in `connectedCallback`; anche `label` e `locale` diventano proprietà;
    - applicato alle 17 classi legacy al `define`;
    - opt-out della riflessione di `data` per i dati live: `defineMiniCharts({ reflectData: false })` o un'opzione statica (D6).
  - Fatto quando: per ogni opzione, la proprietà equivale all'attributo; `el.min = 0` provoca un render; con l'opt-out, `el.data = bigArray` non scrive l'attributo.
  - Finding: adapters-8, adapters-19, core-7 (parz.), data-api-17 (parz.)

- [ ] **P3-3 · Implementare gli attributi che oggi non fanno nulla** · M · dip. P3-1, P1-8
  - Cosa: `pad-angle` della pie, `baseline` della bar, `min` della radial-bar, `win-color`/`loss-color`/`tie-color` della win-loss (precedenza attributo > token > default).
  - File: mini-pie-chart.js:19, mini-bar-chart.js:18, mini-radial-bar-chart.js:27,233, mini-win-loss-chart.js:24-26,86-104
  - Finding: components-bars-financial-6, theming-10, components-bars-financial-18, core-16, data-api-8, components-radial-11 (parz.)

- [ ] **P3-4 · Booleani solo-presenza, nomi canonici, alias deprecati** · M · dip. P3-2
  - Cosa:
    - i flag default-true diventano enum: `caps="round|butt"`, `candle-body="hollow|solid"`, `domain="shared|independent"`, `fill="gradient|solid"`;
    - rinomine: `gap` (bar-gap), `hole` + `donut` solo-presenza (inner-radius), `color-mode` (trend-color), `markers` (points), `point-size`, `needle`, `x-min`/`x-max`/`y-min`/`y-max`, `offset="expand"` (normalize, che resta alias **solo attributo**);
    - risoluzione degli alias con `this.option(name)`;
    - la stringa `'false'` resta accettata in 1.x, con warning;
    - un enum sconosciuto torna al default con warning.
  - Fatto quando: ogni alias rende come la forma canonica e avverte una volta sola; nessuna stringa di warning nel build di produzione di una fixture consumer; `<mini-pie-chart donut>` funziona; uno smoke test senza bundler (import map) non lancia errori.
  - Finding: adapters-7, data-api-9, components-cartesian-11, components-radial-5, components-bars-financial-5, core-21, data-api-14, components-radial-18, theming-21 (parz.), data-api-21 (parz.), components-cartesian-20 (parz.)

- [ ] **P3-5 · Contratto eventi additivo** · M · dip. P3-1
  - Cosa:
    - `core/events.ts`; detail arricchito: `chart`, `index`, `seriesIndex`, `value`, `datum`, `color` (letto con getComputedStyle), `formattedValue`, `clientX/clientY`, `pointerType`;
    - `sourceIndex` **omesso fino alla 1.9**, per non pubblicare valori sbagliati;
    - `element` diventa un getter deprecato;
    - hover deduplicato; `sparkline-select` su ogni chart;
    - doppio dispatch: pie emette anche `slice-select`; gauge e progress emettono `sparkline-threshold`; nuovo `sparkline-error`;
    - i wrapper 1.x espongono gli eventi nuovi.
  - Fatto quando: forma del detail verificata dalla meta; 3 pointermove sullo stesso indice producono 1 evento; `detail.color` riflette `--mini-chart-color-1`.
  - Finding: core-11, data-api-10, components-cartesian-10, components-bars-financial-14, components-radial-23, adapters-10 (parz.), components-radial-9 (parz.), components-cartesian-21 (parz.)

- [ ] **P3-6 · Suite di contratto generata dagli schemi** · M · dip. P3-2…P3-5
  - Cosa: parità attributo/proprietà, reattività di ogni opzione, alias, set prima del define, reconnect, forma degli eventi, corpus di fixture; test di tipo con expect-type.
  - Fatto quando: la suite fallisce se una prop non viene consumata; gira in meno di 60 s.
  - Finding: data-api-8, core-25, packaging-9 (parz.)

- [ ] **P3-7 · Direttive Angular sui tipi dello schema** · M · dip. P2-7, P3-2, P3-5
  - Cosa: input signal camelCase tipizzati (alias kebab deprecati), output dalla tabella eventi, nessun `effect()`; `[attr.x]` per i primitivi e property binding per `data`; fallback `ElementRef` + `afterRenderEffect`.
  - Fatto quando: fixture AOT senza `CUSTOM_ELEMENTS_SCHEMA` verde; l'HTML SSR contiene gli attributi primitivi.
  - Finding: adapters-16, adapters-6

**Configurazione per chart (§3.12)**
- **Ordine:** P3-2 → P3-3 → P3-4 → P3-8 → P3-9 → P3-11 → P3-10 → P3-6 (esteso).
- **Estensioni a item esistenti:**
  - **P3-1** crea anche il tipo `defineChartDocs` (descrizione, `group`, `order`, `control`, `step`, `range`, `autoLabel`; per chart `name`, `summary`, `category`, `related`, generatore dati, `edgeCases`). Un campo mancante è un errore TS. Questi campi non entrano mai nello schema runtime.
  - **P3-3** scrive le var private `--_mc-*` già nella forma D17.
  - **P3-4** aggiunge `interaction="none|hover|select"` (con `interactive` come alias di `hover`).
  - **P3-6** contiene la matrice di precedenza di P3-8.

- [ ] **P3-8 · API di configurazione per istanza: `options`, `preset`, `resolvedOptions()`, `optionSource()`** · L · dip. P3-2, P3-3, P3-4
  - Cosa:
    - `core/options.ts` con il resolver puro `resolveOptions(schema, layers) → { values, sources }`, senza DOM, dietro il seam `this.option(name)` di P3-4;
    - risoluzione in due fasi e sotto-livelli attributo/proprietà con la guardia `#reflecting` (D16);
    - superficie: `el.options` (si sostituisce soltanto), `el.preset` (riflesso), `resolvedOptions()`, `optionSource()`; `options` e `preset` impostati prima del define sopravvivono all'upgrade;
    - il livello 3 (valori dai dati) in 1.6 copre solo i valori posizionali già esistenti di gauge e bullet, e si formalizza in P6-1;
    - in 1.6 i 17 componenti leggono le opzioni **solo** tramite `this.option()`. I default letterali spariscono famiglia per famiglia in P7-P8; il controllo grep resta consultivo fino a P9-1.
  - File: packages/core/src/core/options.ts, core/props.ts, meta/types.ts, components/*.js, test/contract/options.test.ts
  - Fatto quando:
    - sostituire `options` cancella le chiavi rimosse;
    - `optionSource()` restituisce il livello giusto in ogni caso della matrice;
    - "`el.x = false` → riflessione → ancora false con `defaults:{x:true}`" è verde;
    - lo strato pesa ≤ 1 KB min+gz.
  - Finding: chart-config-3, chart-config-4 (parz.), chart-config-6 (parz.)

- [ ] **P3-9 · Default per tipo e preset nel registry** · M · dip. P3-8
  - Cosa:
    - `DefineMiniChartsOptions` (`registry`, `defaults`, `presets`, `reflectData`, `dev`), con la forma posizionale `defineMiniCharts(registry)` ancora valida;
    - `configureMiniCharts(patch, { registry })` produce un solo render per ogni chart connesso;
    - `defineChartPreset(name, map, { registry })`;
    - store come in §3.12;
    - validazione immediata, alla chiamata: le prop `instanceOnly`, `css` e booleane a sola presenza sono rifiutate con un warning che indica l'alternativa.
  - File: packages/core/src/define.ts, core/options.ts, core/registration.ts, test/contract/registry-defaults.test.ts
  - Fatto quando:
    - importare il wrapper React prima di `configureMiniCharts` non fa perdere i default;
    - cambiare il default di `gap` di `mini-bar-chart` produce esattamente un render per ogni bar connessa;
    - `defaults: { 'mini-line-chart': { data: [] } }` è un errore di tipo e un warning;
    - i registry con scope (`new CustomElementRegistry()`, dove supportato, con skip guard) tengono default separati;
    - `defineMiniCharts(customElements)` funziona ancora.
  - Finding: chart-config-3, chart-config-7

- [ ] **P3-11 · Contenuti di `<tag>.docs.ts` per i 17 chart** · M · dip. P3-1 (esteso)
  - Cosa:
    - descrizioni di circa 93 opzioni, degli eventi e dei token, con gruppi e suggerimenti per la UI;
    - un nome canonico unico per chart, che mette fine ai nomi diversi tra sidebar, card e catalogo;
    - esempi strutturati (P4-3 esteso);
    - qui confluisce la prosa oggi sparsa tra docs/components/*.md, il dizionario i18n della demo e il README.
  - Fatto quando: un test verifica che ogni prop abbia `description` e `group` e che da ognuna si possa ricavare un controllo; il size-limit degli schemi runtime non cambia.
  - Finding: demo-arch-2 (parz.), demo-ux-9 (parz.), chart-config-1 (parz.)

- [ ] **P3-10 · Warning in dev per attributi e chiavi sconosciuti** · S · dip. P3-4, P3-9
  - Cosa:
    - al primo connect, `warnOnce` con un suggerimento did-you-mean (Levenshtein ≤ 2 su prop, alias e attributi), con l'allowlist di §3.12;
    - lo stesso controllo vale per le chiavi di `options`, `defaults` e `presets` e per i nomi di preset sconosciuti;
    - gli enum sconosciuti restano a P3-4.
  - Fatto quando:
    - `<mini-line-chart endpoint="last">` avverte una sola volta in dev;
    - il build di produzione di una fixture non contiene le stringhe dei warning;
    - gli attributi aggiunti da Angular, Vue e Astro non producono warning.
  - Finding: chart-config-5

### P4 · 1.7.0 · Contratto pubblicato: codegen, tipi, esempi, fixture raw

- [ ] **P4-1 · Codegen v1: CEM, tipi per i framework, dati IDE, tabelle docs** · L · dip. P3-1, P3-5
  - Cosa:
    - `tools/codegen` produce `custom-elements.json`, `types/elements.d.ts`, `jsx/{react,preact,solid}`, `types/{svelte,vue}`, i dati per VS Code (solo token consumati fino a P7-2) e web-types;
    - tabelle in docs/components/*.md tra marker generati;
    - `pnpm codegen --check` in CI.
  - Fatto quando: TSX React 19, Svelte 5 e Solid compilano `curve`, `data` e `onsparkline-hover`; `curve="smoth"` è un errore di tipo; `querySelector('mini-line-chart')` è tipizzato.
  - Finding: adapters-11, packaging-10, components-cartesian-9, adapters-12 (parz.), data-api-7 (parz.), theming-8 (parz.)

- [ ] **P4-2 · `preupgrade.css` + test di import senza DOM** · S · dip. P4-1
  - Cosa: `mini-x-chart:not(:defined){display:inline-block;aspect-ratio:…}` generato dallo schema; ogni entry si importa con i globali DOM rimossi; `**/*.css` aggiunto a `sideEffects`.
  - Fatto quando: CLS 0 nella fixture.
  - Finding: core-20 (parz.)

- [ ] **P4-3 · Esempi per chart generati e type-checked** · M · dip. P4-1
  - Cosa: snippet tsx, vue, angular, svelte, solid e html controllati con tsc, vue-tsc, ngc strictTemplates e svelte-check; docs e demo importano solo questi.
  - Finding: adapters-22, adapters-12 (parz.), adapters-20 (parz.)

- [ ] **P4-4 · Harness pack-and-install + fixture raw** · L · dip. P4-1, P2-7
  - Cosa:
    - `pnpm pack`, poi `npm install` dei tarball senza link al workspace;
    - fixture: vite-vanilla, sveltekit, solid-vite, astro, next-app-router-raw, angular-aot, più uno smoke **senza bundler** (import map/CDN);
    - smoke Playwright per ognuna: upgrade, part, evento, console pulita;
    - sulle PR con path filter, ogni notte con le ultime versioni.
  - Fatto quando: una regressione introdotta apposta fa fallire almeno una fixture.
  - Finding: adapters-13, adapters-12 (parz.), packaging-9 (parz.)

**Configurazione pubblicata e sito**

**Estensioni a item esistenti**
- **P4-1 esteso:**
  - nel CEM: `options`, `preset`, `resolvedOptions()`, `optionSource()`, `default` e `deprecated` per ogni prop;
  - da `./types`: `ChartOptionsMap`, `ChartTag`, `ChartDefaults<T>`, `ChartPreset` e `DefineMiniChartsOptions`;
  - nelle tabelle docs: colonne Since, Alias, Canale token e Solo istanza;
  - nuovo output privato `tools/codegen/generated/chart-meta.json`, coperto da `codegen --check`.
  - Fatto quando: `defaults: { 'mini-line-chart': { curve: 'smoth' } }` è un errore di tipo.
- **P4-3 esteso:**
  - esempi strutturati in `docs.ts` (`{ id, title, data, options, tokens? }`, almeno 3 per chart, forme canoniche);
  - template degli snippet come moduli ESM puri, importabili sia dal codegen sia dal browser (configuratore), che emettono solo i valori diversi dal default;
  - sostituiscono le 68 stringhe scritte a mano della demo.

- [ ] **P4-5 · Sito `apps/docs` (Astro Starlight): scheletro, design system provvisorio, gate** · L · dip. P2-1, P4-1, P4-2
  - Cosa:
    - Starlight con la libreria consumata tramite gli exports e la registrazione in un override di `Head`. Locale `root` in inglese configurata subito (D14).
    - Pagine:
      - splash con chart in contesti reali e installazione con tab;
      - `/getting-started/*` e `/frameworks/*` migrati da docs/ e README;
      - `/changelog/` e 404.
    - Design system provvisorio (§3.13): paletta di Starlight più stage dei chart temizzati con scope; ThemeSelect di Starlight; Fontsource; icone Starlight.
    - Componenti `ChartStage` (box da `aspectRatio` + `preupgrade.css`, dati sempre con `JSON.stringify`), `StatusRegion` e tab sincronizzati.
    - CI `docs.yml`:
      - `astro check` e build;
      - smoke su ogni route;
      - axe in 4 modalità, con l'allowlist a scadenza di D19;
      - viewport 320, 768 e 1280;
      - link checker;
      - test "nessun `[object Object]`".
    - Lighthouse CI arriva in P4-6, quando esistono i template rappresentativi.
    - Vercel: secondo progetto con anteprima per ogni PR e sottodominio `next.`, entrambi `noindex`. Guida di stile breve in CONTRIBUTING.
  - Fatto quando: gate verdi; 0 richieste a terze parti; ogni PR ha un'anteprima; cambiare tema con ThemeSelect cambia i colori dei chart.
  - Finding: demo-arch-4, demo-ux-4, demo-ux-15, demo-a11y-6, demo-a11y-14, demo-a11y-18, demo-a11y-19, demo-a11y-21, demo-arch-11 (parz.)

- [ ] **P4-6 · Pagine dei chart, gallery e reference generate** · L · dip. P4-1 (esteso), P4-3 (esteso), P4-5, P3-11
  - Cosa:
    - collection `charts` (loader su `chart-meta.json`) ed `examples`;
    - uno stub MDX per chart generato dal codegen, con slot per la prosa;
    - componenti a zero JS: `ChartPage` (ordine di §3.13, primo stato sempre di default), tabelle, `DataShape`, `ExampleTabs`, `ChartGallery`;
    - `/charts/` per categoria con filtro;
    - `/guides/configuration/` con esempi solo HTML/JS raw (le tab dei wrapper arrivano con P5-1);
    - `/theming/` provvisoria con i soli token consumati e la precedenza reale;
    - Lighthouse CI con i budget di D19.
  - Fatto quando:
    - una prop aggiunta allo schema compare in tabella, nei tipi e negli esempi con un solo `pnpm codegen`;
    - nessuna tabella API è scritta a mano;
    - le 17 pagine passano i gate;
    - Pagefind trova ogni chart per nome e per tag.
  - Finding: demo-arch-2, demo-arch-12, demo-ux-1, demo-ux-9, demo-ux-16 (parz.), chart-config-1, chart-config-8

### P5 · 1.8.0 · Wrapper generati, pacchetti scoped, matrice adapter

Anticipata rispetto al design originale: i wrapper dipendono solo dal contratto runtime (P3) e dal codegen (P4), non dal ritiro del legacy. Così gli high sugli adapter si chiudono 4-6 mesi prima.

- [ ] **P5-1 · Codegen v2: wrapper sottili generati** · L · dip. P3-7, P4-1
  - Cosa:
    - React: prop dello schema come proprietà, `data` come JSON in SSR e nel render di idratazione, eventi, tipi Props/Ref/EventMap, `'use client'`, subpath per chart, PURE, registrazione lazy;
    - Vue: `PropType`, emits, `.prop`, `expose({el})`, GlobalComponents;
    - Angular: le direttive di P3-7 diventano generate;
    - codice generato committato e controllato per drift.
  - Fatto quando: una prop aggiunta allo schema rigenera wrapper, tipi e docs con un solo comando; nessun codice per chart scritto a mano.
  - Finding: adapters-5, adapters-9, adapters-10, adapters-15, adapters-17, adapters-20, adapters-21, packaging-11

- [ ] **P5-2 · Pacchetti `@sparkline-mini-charts/react` e `/vue`** · M · dip. P5-1
  - Cosa:
    - tsdown, solo ESM; peer `react ^18.3 || ^19`, `vue ^3.5`, core `^1.8.0`;
    - `static version` con warning se convivono due versioni del core;
    - bootstrap npm come in P2-7;
    - i subpath `./react` e `./vue` del core vengono rigenerati dagli stessi template e deprecati.
  - Fatto quando: pubblicati con provenance; una fixture con il tree-shaking include un solo chart.
  - Finding: adapters-18, packaging-18 (parz.)

- [ ] **P5-3 · Matrice adapter e fixture dei wrapper** · M · dip. P5-2, P4-4
  - Cosa:
    - React 18.3/19 con RTL (`renderToString` + `hydrateRoot`), Vue 3.5 con test-utils + server-renderer, Angular TestBed sull'output di ng-packagr, Svelte 5 compile-and-mount;
    - stress del ciclo di vita: React StrictMode, Vue KeepAlive/Teleport, Angular zoneless + CDK drag-drop, riordini con key;
    - test di tipo;
    - fixture vite-react18, next-app-router, nuxt, angular-ssr.
  - Fatto quando: nessun warning di idratazione; una fixture rossa blocca il rilascio.
  - Finding: adapters-13, packaging-9, adapters-12 (parz.)

- [ ] **P5-4 · Ricette per i framework con soli tipi + ADR "niente wrapper Svelte"** · S · dip. P5-3
  - File: docs/frameworks/{svelte,solid,preact,lit,qwik,astro,vanilla}.md, docs/decisions/0001-no-svelte-wrapper.md
  - Finding: adapters-12

**Configuratore e cutover del sito**

**P5-1 esteso: configurazione nei wrapper**
- **Prop:** i wrapper accettano `options?: Partial<O>` e `preset`. `options` va su `el.options`, le prop esplicite vanno come proprietà, e un `false` esplicito arriva sempre all'elemento.
- **SSR:** le chiavi diventano canoniche e si appiattiscono in attributi.
- **Preset di sottoalbero:** context React, `provide` Vue, `provideSparklineCharts({ defaults, presets })` in Angular.
- **Docs:** le tab dei wrapper si aggiungono a `/guides/configuration/`.
- **Fatto quando:**
  - con un default di registry `true`, `hollowBullish={false}` lo spegne;
  - togliere una chiave da `options` tra due render ripristina il default;
  - nessun alias viene mai assegnato come proprietà.

- [ ] **P5-5a · Configuratore: controlli, stage, URL, export del codice** · L · dip. P3-5, P3-9, P4-6, P5-1
  - Cosa: `<smc-configurator>` (D15, script lazy e niente `client:*`).
    - Controlli generati da `chart-meta.json` (tabella di §3.13), raggruppati, con reset.
    - Stage unico aggiornato tramite proprietà: dimensioni 80, 160 e 320 px più una maniglia; sfondo light o dark; contesti card, riga e inline.
    - Stato nell'URL come in §3.13: `v=`, compressione, alias, avviso quando lo stato viene troncato, rifiuto di `url(`.
    - Codice dai template di P4-3 in 6 framework, più `options`, `defineChartPreset` e CSS; viene mostrato come `<pre>` senza syntax highlighting.
    - Il configuratore compare in cima a ogni `/charts/<slug>/`.
  - File: apps/docs/src/islands/configurator/**, apps/docs/test/configurator.spec.ts
  - Fatto quando:
    - una prop aggiunta allo schema compare senza codice specifico per chart (test di contratto);
    - per ogni chart, il codice esportato e incollato in una fixture dà gli stessi `resolvedOptions()` dello stage;
    - un URL condiviso riproduce lo stato;
    - tutto si usa da tastiera e axe è pulito;
    - il JS pesa ≤ 25 KB gz.
  - Finding: demo-ux-1, demo-ux-2, demo-arch-9, demo-a11y-11, chart-config-2, chart-config-11

- [ ] **P5-5b · Configuratore: dati, eventi, inspector, `/playground/`** · M · dip. P5-5a
  - Cosa:
    - pannello Data: JSON, o CSV per le serie piatte; generatori per tipo di normalizzatore; esempi di `docs.ts`;
    - pannello Eventi: `role=log`, 50 voci, pausa e svuota, hover limitato;
    - Inspector con `resolvedOptions()` e `optionSource()`;
    - `/playground/` con selettore dei chart e ricerca;
    - sostituisce il playground e la pagina di dettaglio della demo legacy.
  - Fatto quando: un JSON non valido dà un errore inline accessibile; ogni evento dello schema compare nel log; l'inspector mostra il livello di provenienza.
  - Finding: demo-ux-11 (parz.), chart-config-9

- [ ] **P5-6 · `/live/`, parità, SEO e cutover del dominio** · M · dip. P5-5b, P5-4, P3-2
  - Cosa:
    - **`<smc-live-board>`:**
      - scheduler su rAF, attivo solo con la pagina visibile e la card sullo schermo;
      - parte in automatico solo senza reduced motion; pausa per prima, con `aria-pressed`;
      - nessun `aria-live` sui chart;
      - dati via `el.data` con `reflectData: false`; 6 chart, con l'opzione "mostra tutti";
      - ricette in vanilla, React, Vue e Angular.
    - **Checklist di parità:**
      - ogni route legacy ha una destinazione (tabella di §3.13);
      - ogni chart ha pagina e configuratore;
      - le ricette dei framework sono pubblicate;
      - sitemap, canonical, meta description, OG.
    - **Cutover:**
      - shim dei redirect;
      - il dominio passa ad `apps/docs`;
      - si eliminano `apps/demo/`, `docs/demo-guide.md` e il vecchio `vite.config.demo.js`.
    - **Screenshot del README** rigenerati da Playwright, con URL assoluti e fallback `<img>` in light; controllare la pagina renderizzata su npm.
  - Fatto quando:
    - ogni URL della tabella dei redirect arriva alla pagina giusta;
    - con il tab nascosto le scritture restano a 0;
    - con reduced motion la board parte in pausa;
    - lo smoke di produzione è verde;
    - nel repo non resta alcun riferimento a `demo/`.
  - Finding: demo-arch-7, demo-ux-10, demo-ux-16, demo-a11y-3, demo-a11y-16 (parz.), demo-a11y-17, demo-arch-12 (parz.)

### P6 · 1.9.0 · Modello dati tipizzato e math v2

**Regola:** in questa fase i componenti legacy cambiano solo le funzioni dietro il barrel `geometry.ts` e i corpi di `parseData`. Le modifiche a livello di componente spettano alle famiglie migrate (P7-P8).

- [ ] **P6-1 · Tipi del modello dati e normalizzatori dietro `parseData`** · L · dip. P3-4, P3-5
  - Cosa:
    - `data/types.ts` e i 10 normalizzatori di §3.4: risultato congelato `{model, issues}`, mai eccezioni, `sourceIndex` preservato, memo;
    - nuove forme accettate (OHLC come oggetti + `format`, meter come oggetto, bullet, combo `{series}`, `Series`, radial come oggetti, CSV sull'attributo);
    - `gaps` limitato a `drop|zero` sui renderer legacy;
    - colori dai dati validati;
    - `sourceIndex` reale negli eventi;
    - export `./types`;
    - gauge posizionale e tuple bullet deprecati.
  - Fatto quando:
    - corpus (null, NaN, stringhe, campi extra, serie irregolari, Date, 100k punti) con snapshot `{model, issues}`;
    - in una pie, `[10,null,5]` tiene la fetta 3 sul colore 3;
    - l'hover sull'indice 2 di `[1,null,3]` riporta sourceIndex 2;
    - `data="1, 2 3"` produce 3 punti.
  - Finding: data-api-6, data-api-4 (parz.), core-6 (parz.), components-cartesian-6, components-radial-7, components-bars-financial-10, data-api-5, components-bars-financial-21, components-cartesian-17 (parz.), components-radial-17 (parz.), geometry-6 (parz.)

- [ ] **P6-2 · Geometria divisa nei moduli `math/` + barrel di compatibilità** · L · dip. P2-3, P2-6
  - Cosa:
    - moduli di §3.7, con le costanti in `ChartFrame`;
    - `geometry.js` diventa un barrel di wrapper deprecati;
    - `defined` per i buchi;
    - **x non uniforme**: dominio x da `SeriesModel.x` (numero o Date) e `invert()` per l'hover;
    - `THIRD_PARTY_NOTICES`.
  - Fatto quando:
    - il vecchio test di geometria passa sul barrel;
    - invarianti fast-check verdi;
    - golden dei path;
    - un path lineare di 1000 punti è lungo al massimo il 45% di quello della 1.4;
    - `[{x:t0},{x:t0+1h},{x:t0+5h}]` dà x proporzionali al tempo.
  - Finding: geometry-8, geometry-16, geometry-18, geometry-19, geometry-24, geometry-26, components-cartesian-25, geometry-21, geometry-6 (parz.)

- [ ] **P6-3 · Politica di dominio unica** · M · dip. P6-2
  - Cosa: `resolveDomain` con min ≥ max → estensione + warning, limiti da un solo lato, `include`, clamp, clip di plot; reference line dalla scala; dominio automatico per il bullet; `include-reference`.
  - Fatto quando: `createBarLayout([2,8],{min:5})` resta nel viewBox; un bullet con dati tra 0 e 1 è visibile.
  - Finding: geometry-4, components-cartesian-14, geometry-15, geometry-17, core-22, data-api-19, components-bars-financial-15 (parz.), geometry-14 (parz.), components-bars-financial-25 (parz.)

- [ ] **P6-4 · Smoothing monotone e registry delle curve** · M · dip. P6-2
  - Cosa: `smooth` = monotone-X (Fritsch-Carlson), catmull-rom opt-in, curve validate; "Changed" con screenshot prima/dopo.
  - Fatto quando: `[0,0,0,10,10,10]` non attraversa la baseline; `curve="smoth"` rende linear e avverte.
  - Finding: geometry-3, geometry-23, components-cartesian-20

- [ ] **P6-5 · Offset di stacking** · M · dip. P6-2
  - Cosa: offset none, expand, diverging, silhouette, wiggle, più `order`; diverging di default con segni misti.
  - Fatto quando: `[[5,-4],[5,4]]` non produce sovrapposizioni.
  - Finding: geometry-5, components-cartesian-16 (parz.)

- [ ] **P6-6 · Generatore d'arco v2** · M · dip. P6-2
  - Cosa: `arcPath` con sweep che segue la direzione, cerchio pieno in due semiarchi, archi oltre π divisi, pad-angle; radial-bar con larghezza e passo degli anelli calcolati insieme.
  - Fatto quando: `[1e6,1]` mostra la fetta dominante; 20 anelli non si sovrappongono.
  - Finding: geometry-11, geometry-12, components-radial-16, components-radial-14, components-radial-29 (parz.)

- [ ] **P6-7 · Serie grandi: hover O(log n) e downsampling** · S · dip. P6-2
  - Cosa: hover con `scale.invert` e ricerca binaria; `max-points` con LTTB o min-max e mappa degli indici. **[rinviabile 2.1 solo per il downsampling]**
  - Finding: geometry-10, components-cartesian-15

- [ ] **P6-8 · Regressione stabile e bolle in scala** · S · dip. P6-2
  - Cosa: regressione centrata sulla media e tagliata con Liang-Barsky; scala sqrt per le bolle.
  - Fatto quando: 60 punti con x ≈ 1.7e12 producono una trend line; una bolla con r=50 resta nel viewBox.
  - Finding: geometry-13, geometry-20, data-api-20 (parz.), components-cartesian-17 (parz.)

- [ ] **P6-9 · Superficie pubblica di `./math` v2** · S · dip. P6-2
  - Cosa: primitive stabili in `./math`, layout specifici in `./math/experimental`, vecchi nomi `@deprecated`, docs/math.md.
  - Finding: geometry-7 (parz.), packaging-12 (parz.)

- [ ] **P6-10 · Guida ai dati generata e `DataIssue` nel configuratore** · S · dip. P6-1, P5-5b
  - Cosa:
    - `/guides/data/`: tabella dei normalizzatori generata, tipi da `./types`, demo di `gaps` aggiunte man mano che le famiglie migrano, catalogo dei codici `DataIssue`;
    - il pannello Data mostra gli issue di `sparkline-data-issue` accanto all'editor (`aria-describedby`).
  - Fatto quando: `[1,"x",3]` mostra un issue `not-finite` all'indice 1.
  - Finding: demo-ux-2 (parz.)

### P7 · 1.10.0 · Nuovo runtime e famiglie financial, cartesian, stacked/combo

- **Uscita:** 7 tag su `ChartElement`; golden di `computeModel`; 0 scritture DOM quando il modello non cambia; tastiera e live region; nessun colore letterale né `!important` nei fogli migrati; fixture CSP verde; benchmark P2-5 non peggiorati.

- [ ] **P7-1 · `ChartElement`: schema, scheduler, `computeModel`, reconciler con chiavi** · L · dip. P6-1, P6-2
  - Cosa: come in §3.3, più l'escape hatch `defineMiniCharts({ legacy: [...] })` per una minor dopo ogni migrazione.
  - Fatto quando: un chart fittizio supera la matrice del ciclo di vita (5 modifiche sincrone danno 1 update); 0 scritture DOM con modello invariato; funziona con CSP Trusted Types; tollera uno shadow root dichiarativo.
  - Finding: core-7 (parz.), core-8 (parz.), core-20 (parz.), components-radial-26, components-bars-financial-22 (parz.)

- [ ] **P7-2 · Token a livelli, StyleRegistry per documento, movimento, forced-colors, modello delle serie** · L · dip. P7-1
  - Cosa:
    - `theme/tokens.ts` genera il foglio base, `tokens.json`, le docs e `MiniChartCSSProperties`;
    - catene legacy **per componente**;
    - privati `--_mc-*` dichiarati `initial` sull'host;
    - `CSS.registerProperty` per pochi colori privati;
    - `theme/series.ts` (`--_mc-series`, `series-count`), qui perché serve già a P7-7;
    - foglio per documento, `<style>` di fallback con `nonce`, più una fixture CSP (`style-src 'self'; require-trusted-types-for 'script'`);
    - token di movimento senza `!important`;
    - collisioni risolte (line-width vs archi, bande bullet vs range-bar, target bullet vs danger).
  - Fatto quando:
    - `--mini-chart-line-width` cambia solo le linee;
    - 200 chart condividono un solo foglio;
    - l'adozione in un iframe funziona;
    - `--mini-chart-color: 12` non disegna nero;
    - un `--mini-chart-win-color` non ricolora le candele.
  - Finding: core-12, core-17, theming-20, theming-16, theming-18, theming-23, data-api-18, theming-7 (parz.), theming-5 (parz.), theming-17 (parz.), theming-21 (parz.), theming-14 (parz.), theming-25 (parz.), components-radial-8 (parz.), components-cartesian-18 (parz.), components-radial-30

- [ ] **P7-3 · Controller di animazione, pool e gradient** · M · dip. P7-1, P7-2
  - Cosa: reveal, stagger, tween e morph; niente reflow né setTimeout; gradient con stop dai token e `--_mc-paint`, così `::part` vince.
  - Fatto quando: nessuna chiamata a getBoundingClientRect al mount; cambiare `--mini-chart-gradient-1` ricolora i gradient.
  - Finding: theming-13, core-19, components-cartesian-19, components-bars-financial-26, components-radial-20 (parz.), components-radial-21 (parz.), components-cartesian-23 (parz.), components-bars-financial-31 (parz.), geometry-25 (parz.)

- [ ] **P7-4 · Interazione e accessibilità** · L · dip. P7-1
  - Cosa: come in §3.6.
    - Regola dei ruoli: img/meter per i grafici non interattivi, group con `aria-roledescription` per quelli interattivi; live region fuori dai sottoalberi presentazionali.
    - Obiettivo **WCAG 2.2 AA**, con protocollo manuale con screen reader: NVDA+Firefox, VoiceOver macOS/iOS, JAWS+Chrome.
    - `prefers-contrast`.
    - Hook `messages` per i testi generati (i18n); decisione sull'RTL documentata.
    - Tabella dati visivamente nascosta opzionale **[rinviabile 2.1]**.
  - Fatto quando: una line si percorre tutta da tastiera con annunci; axe a 0 violazioni; l'`aria-label` dell'host diventa il nome accessibile; con `locale="it-IT"`, 1250,5 diventa "1.250,5".
  - Finding: core-13, core-14, data-api-16, components-cartesian-21, components-bars-financial-27, components-radial-28, components-radial-22 (parz.)

- [ ] **P7-5 · Migrazione pilota: financial (candlestick + ohlc)** · M · dip. P7-2, P7-3, P7-4
  - Cosa: un normalizzatore, un layout e due glifi; part `candle bullish|bearish` e `tick`; token in px che non scalano.
  - Fatto quando: diff visivo entro soglia, con i diff intenzionali elencati nella PR; i nuovi file non superano il 40% delle righe legacy; size-limit non peggiorato.
  - Finding: components-bars-financial-24, core-8 (parz.), components-bars-financial-10 (parz.), components-bars-financial-31 (parz.)

- [ ] **P7-6 · Famiglia cartesian: line + area** · L · dip. P7-5, P6-3, P6-4
  - Cosa: `CartesianSeriesChart` (l'area è una linea più un livello di riempimento); `gaps` break/connect attivi; `markers`; reference line dalla scala; `color-mode="trend"` tramite `:state()`; morph; opacità dell'area dai token.
  - Fatto quando: con `gaps="break"`, `[1,null,3]` disegna due sotto-path; x non uniforme e hover corretti; i nuovi file non superano il 45% delle righe legacy.
  - Finding: components-cartesian-13 (parz.), geometry-6, data-api-4, core-6, geometry-25, components-cartesian-23, components-cartesian-18

- [ ] **P7-7 · Famiglia stacked (stacked + stream) e combo** · L · dip. P7-6, P6-5
  - Cosa: `StackedChart` con `offset` e `order`, stream come preset, livelli `part="layer series series-N"`; combo con input `{series:[…]}` e un adattatore deprecato per `{bar,line}[]`.
  - Fatto quando: il modello combo descritto nelle vecchie docs ora rende; stack di segno misto senza sovrapposizioni.
  - Finding: components-cartesian-13 (parz.), geometry-5, components-cartesian-7, geometry-1, components-cartesian-16

### P8 · 1.11.0 · Famiglie restanti e theming completo

- [ ] **P8-1 · Fette radiali (pie + half-pie) e modello colore delle serie** · M · dip. P7-5, P6-6
  - Cosa: `RadialSlicesChart` (half-pie è un preset); stato vuoto o a somma zero; negativi segnalati come issue; colori degli eventi presi dal tema.
  - Fatto quando: `--mini-chart-series-9` (e il legacy `-color-9`) colora la nona fetta; `[0,0,0]` mostra lo stato vuoto.
  - Finding: theming-9, components-radial-17, components-radial-19, components-radial-10, components-radial-25, data-api-21, components-radial-9, core-8 (parz.)

- [ ] **P8-2 · Radial-bar con il valore disegnato come geometria d'arco** · M · dip. P8-1
  - Cosa: anelli dal reconciler; arcPath + tween; part `ring ring-N`; `max` ancora relativo ai dati in 1.x, con avviso dev.
  - Fatto quando: con reduced motion e `::part(track-fg){stroke-dashoffset:0 !important}` il valore resta corretto.
  - Finding: components-radial-20, components-radial-21, components-radial-29, components-radial-15 (parz.)

- [ ] **P8-3 · Famiglia meter: gauge, progress, bullet** · L · dip. P7-5, P7-3, P6-6
  - Cosa: normalizzatori meter e bullet; `aria-valuetext`; stato vuoto comune; `sparkline-threshold`; zone come bande con part `zone-N`; testo sotto il perno; archi disegnati come geometria; token `--mini-gauge-arc-width`, `--mini-progress-arc-width` e `--mini-bullet-*`.
  - Fatto quando: `--mini-chart-line-width` non cambia gli archi; il progress al 30% resta al 30% con reduced motion e con un override `::part`.
  - Finding: components-radial-8, data-api-3, components-bars-financial-9, components-bars-financial-12 (parz.), theming-7, components-radial-22, geometry-14, components-bars-financial-25, theming-14, theming-25

- [ ] **P8-4 · Barre discrete: bar, win-loss, range-bar** · M · dip. P7-5
  - Cosa: `DiscreteBarsChart`; `corner-radius` canonico; `color-mode="sign"`; normalizzatori outcomes e range; part `bar positive|negative|neutral`; `clipped`; `gaps` come slot vuoto.
  - Fatto quando: un solo `--mini-chart-positive` ricolora barre positive, vittorie e candele bullish.
  - Finding: components-bars-financial-12, components-bars-financial-17, components-bars-financial-22, components-bars-financial-15, components-bars-financial-21

- [ ] **P8-5 · Scatter** · S · dip. P7-5, P6-8
  - Cosa: punti non validi segnalati come issue; buchi omessi; `x-min`/`x-max`; token `--mini-scatter-trend-line`.
  - Fatto quando: `[[1,2],'x',[3,4]]` rende 2 punti e 1 issue.
  - Finding: components-cartesian-12, components-cartesian-17, data-api-20

- [ ] **P8-6 · Vocabolario `::part` condiviso sui 17 tag** · S · dip. P7-6…P8-5
  - Fatto quando: ogni part documentato esiste nel render; `::part(candle bullish)` e `::part(zone-2)` funzionano.
  - Finding: theming-11, components-bars-financial-23, components-bars-financial-31

- [ ] **P8-7 · Preset, dark mode, forced-colors, palette accessibile (opt-in)** · M · dip. P8-6
  - Cosa: `themes/{light,dark,auto,high-contrast,okabe-ito,accessible}.css`; `tools/palette-check` in CI; `SEGMENT_COLORS` deprecato; la demo usa i preset al posto dei token duplicati e delle scritture inline. **È la chiusura completa di theming-12.**
  - Fatto quando: baseline per light, dark, forced-colors e okabe-ito; la board di theming della demo funziona con un solo import.
  - Finding: theming-12, theming-5, theming-17, theming-19

- [ ] **P8-8 · API di tema in JS + `<mini-chart-theme>`** · M · dip. P8-7 · **[opzionale, rinviabile 2.1]**
  - Cosa: `themeToCSS`, `applyTheme`, `MiniChartCSSProperties`, l'elemento `display:contents` e i provider generati per i framework.
  - Finding: — (estensione)

**P8-7 esteso: theming del sito**
- **Preset showcase:** diventano privati del sito (`apps/docs/src/themes/showcase/*.css`), con soli token di livello 1 e 2 in coppie `light-dark()`.
- **palette-check su showcase e `site-bridge.css`, in entrambi gli schemi:**
  - testo ≥ 4,5:1;
  - segni ≥ 3:1;
  - positive/negative separati sotto deuteranopia e protanopia.
- **Sito:** passa al bridge di §3.13 e importa un solo preset più "Alto contrasto".
- **"Fatto quando" spostato qui da P4-5:** cambiare un token ricolora insieme chrome e chart. Cyberpunk in light supera 3:1, altrimenti viene ritirato.

- [ ] **P8-9 · Theme studio su `tokens.json` e `themes/*.css` (assorbe Theming Lab e Gradients Studio)** · M · dip. P7-2, P8-7; export JS dopo P8-8
  - Cosa: `<smc-theme-studio>` in `/theming/studio/`.
    - Controlli generati da `tokens.json` per livello, solo per i token consumati, filtrabili per chart.
    - Preset applicati con classe o `data-theme` su un contenitore di anteprima, mai con scritture inline per elemento; preset base più override salvati nell'URL.
    - Anteprima dei 17 chart in light e dark, con contrasto calcolato dal vivo. Forced-colors non si può limitare a una zona della pagina, quindi si mostra con baseline Playwright generate al build, oppure come simulazione dichiarata.
    - Editor degli stop `gradient-1..3`.
    - Export CSS, più `themeToCSS` e i provider dopo P8-8.
    - Il pannello Token del configuratore passa a `tokens.json`.
  - Fatto quando: nessun token non consumato è controllabile; il CSS esportato e incollato in una fixture dà lo stesso rendering (baseline); axe pulito; gate D19 verdi.
  - Finding: demo-arch-3, demo-arch-8, demo-ux-5, demo-ux-7, demo-ux-11, demo-a11y-5, chart-config-10, demo-a11y-2 (parz.)

### P9 · 1.12.0 · Ritiro del legacy, TS completo, docs

- [ ] **P9-1 · Ritiro del runtime legacy, TS completo, build con tsdown** · M · dip. P8-6
  - Cosa:
    - eliminare componenti legacy, `chartStyles` ed escape hatch; `MiniChartElement` diventa un alias di `ChartElement`;
    - `allowJs` disattivato, `isolatedDeclarations` ovunque;
    - tsdown; foglie `./mini-<x>-chart/define` con `sideEffects` (`./dist/**/define.js`, `**/*.css`), coperte da attw e size-limit;
    - i wrapper (P5) vengono verificati sulle nuove classi.
  - Fatto quando: zero file .js in `packages/core/src`; compare-pack e attw puliti; size-limit totale ≤ 1.4.2; matrice adapter verde.
  - Finding: core-8, components-cartesian-13

- [ ] **P9-2 · Registrazione e API di estensione** · M · dip. P9-1 · **[API di estensione rinviabile 2.1]**
  - Cosa: `defineMiniCharts({ prefix, registry })`; test di tolleranza DSD; export sperimentale di `ChartElement` e dei controller.
  - Fatto quando: `acme-line-chart` e `mini-line-chart` convivono nella stessa pagina.
  - Finding: core-24, adapters-23, core-20

- [ ] **P9-3 · Chiusura del sito e bozza della guida di migrazione** · M · dip. P5-6, P8-9, P9-1
  - Cosa: il sito esiste già da P4-5…P5-6; qui si chiude.
    - `MIGRATION-2.0.md` e una sezione Migrazione per ogni chart, generate dalla tabella delle deprecazioni.
    - `docs/components/*.md` eliminati, perché il contenuto vive in `docs.ts`; README ridotto.
    - Reference completa: elements, events, math, theme-api, types, browser support.
    - Ogni pagina chart carica solo la propria foglia `/define` (P9-1); budget JS ricalibrato.
    - Audit finale WCAG 2.2 AA con il protocollo manuale per screen reader di P7-4.
    - Ricette `/examples/` (KPI card, tabella, ticker, dashboard) **[rinviabile 2.1]**.
    - Le docs versionate (v1.x e 2.x) restano a P10-5.
  - Fatto quando: nessuna tabella API scritta a mano; link checker verde; ogni pagina chart carica un solo modulo chart.
  - Finding: theming-8, data-api-7, packaging-15, adapters-12, demo-a11y-16

### P10 · 2.0.0 · Flip dei default e rimozioni (nessuna funzionalità nuova)

- [ ] **P10-1 · Layer compat per la 2.x** · M · dip. P9-1
  - Cosa: alias, catene di token legacy, part, forme dati, eventi e `parseNumericData` vanno in `sparkline-mini-charts/compat`, installato di default ed escludibile con `{compat:false}`; removeIn 3.0.
  - Fatto quando: compat ≤ 3 KB gz; senza compat non resta alcun nome legacy.
  - Finding: theming-21

- [ ] **P10-2 · Flip dei default annunciati** · S · dip. P10-1
  - Cosa: `gaps="break"`; `max` 100 per radial-bar (`max="auto"` per il comportamento precedente); booleani HTML stretti; **`data` non più riflessa**; palette accessibile di default con `classic.css`; **default armonizzati tra chart simili** (`markers`/`points`, `gap`, `corner-radius`, `curve`), con un preset `classic-1x` che ripristina quelli della 1.x.
  - Finding: core-7, data-api-17, components-radial-15

- [ ] **P10-3 · Rimozioni di packaging** · S · dip. P10-1, P5-2
  - Cosa: solo ESM; via `./react`, `./vue` e `./angular` dal core; via la geometria dalla root e `element` dai detail; via `MiniChartProps` (`any`); `sideEffects` = register, compat/install, `**/define.js`, `**/*.css`.
  - Fatto quando: attw e publint puliti; l'API report coincide con MIGRATION; una fixture webpack + Vite importa `themes/dark.css` e una foglia `/define`, ed entrambe hanno effetto.
  - Finding: geometry-7, packaging-12, packaging-18, packaging-11

- [ ] **P10-4 · Guida di migrazione e codemod** · M · dip. P10-1, P10-3 · **[codemod rinviabile 2.1, guida no]**
  - Cosa: regex per HTML/Vue/Svelte/Astro/CSS, jscodeshift per JSX e import. Nel sito, gli esempi "legacy" si rendono in uno stage con compat attivo, oppure diventano codice statico senza anteprima.
  - Fatto quando: `apps/docs` e le fixture passano a `compat:false` con test verdi.

- [ ] **P10-5 · Pre-release e gate della 2.0** · S · dip. P10-2…P10-4
  - Cosa: `2.0.0-next.N` sul dist-tag `next`; creazione di `release/1.x` alla prima `next`; GA dopo almeno 2 settimane senza regressioni; docs versionate (v1.x da `release/1.x` su un sottodominio, canale `next` per la 2.0).
  - Finding: packaging-7

- [ ] **P10-6 · Guardia per le rimozioni della 3.0** · S · dip. P10-1
  - Cosa: la CI fallisce se esiste una deprecazione con removeIn ≤ major corrente; `docs/deprecations.md` generato.

---

## 5. Quando si chiudono i finding critical e high

Conta la versione in cui il finding si chiude **del tutto**. Spesso l'effetto visibile arriva prima, con una correzione parziale: per esempio, i gap visibili per l'utente e `--primary` vengono sistemati già in 1.4.2.

| Release | Critical | High | Cosa si chiude |
|---|---|---|---|
| 1.4.1 | 16 | 4 | setter `data`, doppia codifica React/Vue, prop React, reduced motion, crash con `null`, CI su clone pulito, tipi dei subpath |
| 1.4.2 | — | 30 | reconnect, render doppio, `trend-color`, anelli residui, `gradient="false"`, `--primary`, attributi letti una volta sola, OHLCV, allineamento combo, letterboxing, eventi solo sulle transizioni, pipeline di rilascio |
| 1.5 | 2 | — | Angular AOT (ng-packagr) |
| 1.6 | — | 14 | proprietà per ogni opzione, booleani esprimibili da tutti i framework, attributi morti implementati, contratto eventi |
| 1.7 | — | 3 | CEM e tipi per gli elementi raw, contratto pubblico generato |
| 1.8 | — | 5 | wrapper React e Vue tipizzati, eventi passati dai wrapper, test degli adapter |
| 1.9 | — | 7 | modello dati unico, OHLC validato, gauge posizionale, monotone, validazione del dominio |
| 1.10 | — | 6 | tastiera e a11y, indici preservati nelle famiglie migrate, offset di stack, x non uniforme, gradient a token |
| 1.11 | — | 11 | collisioni dei token, `::part`, preset e dark mode, modello delle serie |
| 1.12 | — | 5 | duplicazione eliminata, docs generate |
| 2.0 | — | 3 | riflessione di `data` rimossa (in 1.x c'è l'opt-out), superficie di `./math` |

---

## 6. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Le decisioni A1-A4 sono assunzioni | Minor additive e tutti gli alias in un'unica tabella: se cambia una decisione cambiano P10 e la forma dei pacchetti, non i contratti |
| Banda di un solo maintainer (circa 195-265 giorni) | Una PR rilasciabile per item, una famiglia alla volta, linea di taglio `[rinviabile 2.1]`, valore concentrato in P0-P5 |
| happy-dom non applica fedelmente la cascata CSS | Test statici sul CSS e verifiche manuali fino a P2-3, poi test in browser reali |
| React 18/19, Vue e Angular gestiscono SSR e proprietà in modo diverso | `data` come JSON in SSR per React e Vue; per Angular, `[attr.x]` più idratazione e `preupgrade.css`; tutto coperto dalla matrice e dalle fixture |
| Cambi visivi percepiti come regressioni | D5, baseline prima/dopo in ogni PR, escape hatch legacy per una minor dopo ogni migrazione |
| Il passaggio al monorepo altera il pacchetto pubblicato | compare-pack, attw/publint, `prepack`, provenance |
| Toolchain TS (TS 7 senza API classica, `isolatedDeclarations` incompatibile con `allowJs`) | Project references, emissione con TS 6 fino a tsdown, attw come guardia |
| Trusted publishing e pacchetti scoped nuovi | Primo publish manuale con `access: public` e trusted publisher configurato subito dopo; `repository.url` corretto già in P0-11 |
| Host binding Angular su un custom element rifiutati dallo schema DOM | Fallback generato `ElementRef` + `afterRenderEffect`, coperto dalla fixture AOT |
| Versioni minime dei browser non testate | Lint di compatibilità sul dist, fallback documentati, WebKit e Firefox in ogni run nel browser |
| CSP stretta (`style-src` senza `unsafe-inline`) | `adoptedStyleSheets` come via principale, `nonce` per il fallback, fixture CSP da P7-2. Fino ad allora il limite è documentato |
| Prestazioni peggiorate dalla riscrittura | Baseline di benchmark e leak in P2-5, soglie in CI da P7 |
| Lo scope npm non è disponibile | Registrazione in P0-11, nomi di ripiego |
| Il lavoro sulla demo legacy si butta | Feature freeze immediato; solo bug e blocchi a11y (P1-18, P1-19); tutto il resto si fa una volta sola, generato, nel sito nuovo |
| Il sito rallenta la libreria | Il sito non sta sul percorso di rilascio npm; i suoi item possono slittare di una minor |
| Pagine bloccate da problemi a11y della libreria, prima di P7-4 | Allowlist axe a scadenza, ogni voce legata a P7-4 |
| Livelli di configurazione e riflessione degli attributi si confondono | Sotto-livelli attributo e proprietà con guardia `#reflecting`, risoluzione in due fasi, matrice generata in P3-6 |
| Link condivisi del configuratore che si rompono tra versioni | `v=` nell'URL, alias mappati alla decodifica, avviso visibile quando lo stato viene troncato |
| Astro serializza gli oggetti negli attributi come `[object Object]` | `ChartStage` usa sempre `JSON.stringify`; test sul build |

---

## 7. Verifica

**Controlli sempre attivi** (ciascuno da quando viene introdotto): lint, typecheck, unit e dom; browser e visual (1.5); package: publint, attw, size-limit, api-report, compare-pack; drift del codegen (1.7); fixture (1.7).

**P0 · 1.4.1**
```bash
git clean -xdf && pnpm install --frozen-lockfile
pnpm typecheck && pnpm test:unit          # senza dist: contract/lifecycle + test adapter React/Vue
pnpm build && pnpm test:package
npx publint && npx attw --pack .          # 24 entry, nessun "missing types"
npm pack --dry-run
git worktree add ../smc-1.4.0 5a9322d     # i check a,b,c,f,g devono fallire sul codice 1.4.0
```
Verifiche manuali:
- Chrome DevTools, `prefers-reduced-motion: reduce`: un progress al 30% mostra 30%;
- test React su 19 e su 18.3;
- fixture Angular JIT e ricetta AOT su Angular 20.

**P1 · 1.4.2**
- `pnpm test:unit` con 0 todo; `check-source` e `check-docs`; attw senza allowlist.
- PR "Version Packages" → publish; badge di provenance e `npm audit signatures`.
- Vercel: preview sui feature branch, produzione solo da main verde.

**P2 · 1.5.0**
- `compare-pack --against 1.4.2`.
- `vitest run --project node --project dom --project browser` su 3 motori.
- `test:visual` in Docker, axe, coverage.
- Benchmark baseline committata.
- `ng build` della fixture AOT su Angular 20 e sull'ultima major.

**P3 · 1.6.0**
- Suite di contratto generata.
- Build di produzione di una fixture consumer senza stringhe di warning.
- Smoke senza bundler.
- `size` (schemi sotto 2,5 KB) e `api:check` (solo aggiunte e deprecazioni).

**P4 · 1.7.0**
- `codegen --check`.
- `test:types`: tsc, vue-tsc, ngc, svelte-check sugli esempi; `curve="smoth"` deve fallire.
- `pnpm fixtures` da tarball.
- Import senza DOM; CLS 0.

**P5 · 1.8.0**
- Matrice adapter: React 18.3/19 SSR + idratazione, Vue SSR, Angular TestBed, Svelte 5, stress del ciclo di vita.
- Fixture dei wrapper.
- size-limit di un singolo wrapper.

**P6 · 1.9.0**
- Snapshot del corpus.
- fast-check e golden dei path.
- Benchmark su 1e6 punti.
- attw per `./math` e `./math/experimental`.

**P7-P8 · 1.10-1.11** (per ogni famiglia migrata)
- `test:visual --grep <famiglia>`, golden di `computeModel`, 0 scritture DOM a modello invariato.
- Fixture CSP + Trusted Types; adozione dei fogli in un iframe.
- Tastiera + axe, forced-colors, reduced motion con override `::part`, `color-scheme: dark`.
- Protocollo manuale con screen reader.
- palette-check; benchmark non peggiorati.

**Demo, configurazione e sito (trasversale)**
- **1.4.2:** `pnpm test:e2e` (smoke e axe della demo legacy su 8 viste, light e dark, 320 e 375 px).
- **1.6:**
  - matrice di precedenza generata (6 livelli, alias, `false` esplicito con default `true`, sostituzione di `options`, ordine dei preset);
  - size-limit dello strato options ≤ 1 KB;
  - warning solo in dev.
- **1.7-1.8:**
  - `pnpm --filter docs build && pnpm --filter docs test`: axe in 4 modalità, viewport, link checker, nessun `[object Object]`, Lighthouse CI con i budget di D19;
  - test di contratto del configuratore (ogni prop ha un controllo);
  - round-trip "codice esportato → fixture → stessi `resolvedOptions()`";
  - URL condivisi;
  - redirect degli hash legacy e smoke di produzione dopo il cutover.
- **1.11:** palette-check su showcase e bridge; baseline del theme studio; ThemeSelect che ricolora i chart.

**P9-P10 · 1.12 / 2.0**
- Nessun `.js` in `packages/core/src`; attw/publint solo ESM.
- `pnpm fixtures --all`.
- Codemod su demo e fixture con `compat:false`; finestra `next` di almeno 2 settimane.

---

## 8. Azioni che spettano a te

Non si possono automatizzare:
1. Confermare o correggere A1-A4 e D1-D12, soprattutto D2 (GitHub canonico e identità `ErlonRr`) e D3 (Vercel).
2. Creare l'org npm `@sparkline-mini-charts` con 2FA (P0-11).
3. Configurare branch protection su GitHub (P0-2) e trusted publisher su npm (P1-16, P2-7, P5-2).
4. Collegare il progetto Vercel per preview e produzione (P1-17).
5. Confermare D13-D19, in particolare il sito unico (D13) e la lingua (D14).
6. Creare il secondo progetto Vercel con root `apps/docs` e il sottodominio `next.` (P4-5), poi spostare il dominio di produzione al cutover (P5-6).

**Dopo l'approvazione** si parte da P0, nell'ordine indicato. Ogni item diventa una PR con il suo changeset.
