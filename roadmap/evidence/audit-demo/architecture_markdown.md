### 3.12 Configurazione per chart (1.6; nel CEM in 1.7, nei wrapper in 1.8)

**Situazione di partenza**
- **Opzioni:** 76 attributi specifici in 17 componenti, più `data`, `label` e `interactive` su tutti (93 opzioni se si escludono `data` e `label`).
- **Default:** sono scritti nel punto in cui si leggono, in 5 modi diversi:
  - `getAttribute(x) || "<d>"`;
  - `!== "false"`;
  - `hasAttribute`;
  - valori presi dalla posizione nei dati (gauge, bullet);
  - fallback interpolati nel CSS, dove il token vince sull'attributo.
- **Incoerenze tra chart simili:**
  - `points` vale `last` nella line (mini-line-chart.js:329) e `none` nella area (mini-area-chart.js:434);
  - `gap` vale 0.2 nella bar e 0.25 nella range-bar;
  - `radius` vale 0, 2 o 3 secondo il chart.
- **Nessun controllo dall'esterno:** nessun default si legge o si sovrascrive da fuori. `defineMiniCharts` accetta solo un registry (src/define.js:49).

**Principio.** Lo strato di configurazione si appoggia su `ChartSchema<M, O>` (§3.2): **`O` è il tipo delle opzioni**, quindi niente si dichiara due volte. Lo schema runtime guadagna solo due campi:

```ts
// packages/core/src/meta/types.ts (aggiunte)
interface PropDescriptor<T = unknown> {
  // ...campi di §3.2
  instanceOnly?: boolean;          // data, label, aria: vietate in defaults e presets
  css?: `--_mc-${string}`;         // prop con canale CSS (D17): l'istanza scrive la var privata; default solo nel fallback CSS
}
// Chiavi riservate, vietate come nomi di prop negli schemi: options, preset (guardia di P3-1 estesa)
```

**Superficie**
```ts
// istanza (P3-8)
el.curve = 'smooth';                                // accessor P3-2 = livello esplicito; undefined o null lo cancella
el.options = { curve: 'smooth', markers: 'none' };  // sostituzione, copia shallow congelata, mai riflessa
el.preset = 'compact dense';                        // riflesso su preset="compact dense"; vince il nome più a destra
el.resolvedOptions();                               // Readonly<O> congelato, dopo tutti i livelli
el.optionSource('curve');                           // 'attribute' | 'property' | 'options' | 'data' | `preset:${string}` | 'defaults' | 'schema' | 'token'
el.requestUpdate('zones');                          // dopo una mutazione in place di un json/colorList (§3.3)

// registry (P3-9): un solo oggetto tipizzato, esteso poi da legacy (P7-1), prefix (P9-2) e compat (P10-1)
defineMiniCharts({
  registry: customElements,
  reflectData: false,                                                    // P3-2 / D6
  defaults: { '*': { interactive: true, locale: 'it-IT' }, 'mini-line-chart': { curve: 'smooth' } },
  presets:  { compact: { 'mini-line-chart': { markers: 'none' }, 'mini-bar-chart': { gap: 0.1 } } },
});
defineMiniCharts(customElements);                    // la forma posizionale 1.x resta (duck typing su define/get)
configureMiniCharts({ defaults: { 'mini-bar-chart': { gap: 0.15 } } }, { registry });  // merge a runtime: un render per ogni chart connesso
defineChartPreset('dense', { 'mini-bar-chart': { gap: 0.05 } }, { registry });
```

**Tipi generati** (P4-1, esportati da `./types`):
- `MiniLineChartOptions`, alias della `O` dello schema;
- `ChartOptionsMap` e `ChartTag = keyof ChartOptionsMap`;
- `ChartDefaults<T extends ChartTag> = Partial<Omit<ChartOptionsMap[T], InstanceOnly<T>>>`;
- `ChartPreset = { [T in ChartTag]?: ChartDefaults<T> }`;
- `DefineMiniChartsOptions`.

**Precedenza (D16, dal livello più forte)**
1. Attributo o proprietà esplicita (P3-2).
2. `options` d'istanza.
3. Valori dentro i dati: `min`, `max`, `target` e `ranges` di meter e bullet; `Datum.color`.
4. `preset` d'istanza: vince il nome più a destra.
5. Default per tipo del registry: la chiave tag vince su `'*'`.
6. Default dello schema in JS, oppure, per le prop con `css`, la catena di token in CSS (§3.8).

**Regole**
- **Alias:** si risolvono nel nome canonico **dentro ogni livello**, prima di unire i livelli (tabella alias di P3-4). Se lo stesso livello contiene sia il canonico sia un alias, vince il canonico e si emette un solo warning.
- **`undefined`:** significa "non impostato". Un `false` esplicito si salva nel livello esplicito come proprietà, senza riflessione.
- **Booleani a sola presenza:** l'HTML non sa esprimere `false`. Con `defaults: { interactive: true }`, un autore HTML può spegnere il flag solo con un preset o con `options`. Va documentato. I flag pensati per i default diventano enum (P3-4).
- **Chiave `'*'`:** accetta solo le prop comuni a tutti i 17 schemi: `interactive` e `locale`, poi `motion` e `gaps`.
- **Esclusioni da `defaults` e `presets`:** le prop `instanceOnly` e le prop `css` vengono rifiutate, con warning in dev ed errore di tipo.
- **Funzioni:** `formatter` e `messages` restano proprietà e non sono mai opzioni (D18).

**Validazione (P3-10, solo sotto la condizione dev di §3.10, 0 byte in produzione)**
- Ogni livello passa dallo stesso converter dei `PropDescriptor` degli attributi.
- `defaults` e `presets` si validano subito, alla chiamata, così lo stack trace punta alla configurazione.
- **Chiavi e attributi sconosciuti:** generano `warnOnce` con un suggerimento did-you-mean (Levenshtein ≤ 2).
  - L'allowlist degli attributi comprende quelli globali, `aria-*`, `data-*`, `on*` e gli artefatti dei framework: `_ngcontent-*`, `_nghost-*`, `ng-*`, `data-v-*`, `astro-*`.
  - Questo controllo avrebbe intercettato `endpoint="last"` (demo/index.html:2447).
- **Enum e preset sconosciuti:** un valore enum sconosciuto torna al default; un preset sconosciuto viene ignorato. In entrambi i casi c'è un warning.

**Ciclo di vita e reattività**
- `options` si può solo sostituire. Ogni cambio di `options`, di `preset` o dei default di registry entra nel set di chiavi cambiate dello scheduler, quindi c'è un solo render per microtask.
- `options` e `preset` impostati prima del `define` vengono recuperati all'upgrade, come le altre proprietà.
- `resolveOptions(schema, layers) → { values, sources }` in `core/options.ts` è una funzione pura, senza DOM. La riusano i golden di `computeModel`, `ChartElement` (P7-1) e l'SSR DSD (2.1).

**Scope**
- Lo store vive in `WeakMap<CustomElementRegistry, Store>`, più una chiave globale per l'SSR.
- L'elemento cerca il suo registry in quest'ordine: `this.customElementRegistry`, poi `ownerDocument.defaultView.customElements`, poi `globalThis.customElements`.
- Lo store è **indipendente dall'ordine di registrazione**. Oggi il wrapper React registra all'import (src/react/index.ts:217) e la direttiva Angular nel costruttore (src/angular/mini-chart.directive.ts:99): un default legato alla prima classe definita andrebbe perso in silenzio.
- Ogni store tiene un Set delle istanze connesse, così `configureMiniCharts` può rifare il render.
- Le chiavi sono i tag canonici, che restano stabili anche con il prefisso di P9-2.

**Wrapper (P5-1 esteso)**

| Contesto | Uso |
|---|---|
| HTML / SSR | `<mini-line-chart preset="compact" curve="smooth" data="1,2,3">` |
| JS | `el.options = { curve: 'smooth' }`; `configureMiniCharts({...})` |
| React | `<MiniLineChart options={opts} curve="smooth" />`; `<SparklinePresetProvider preset="compact">` opzionale |
| Vue | `<MiniLineChart :options="opts" />`; `provide` per il preset di default |
| Angular | `<mini-line-chart [options]="opts">`; `provideSparklineCharts({ defaults, presets })` |
| Svelte 5, Solid | `<mini-line-chart options={opts}>`, assegnato come proprietà |

**Comportamento dei wrapper**
- Uniscono `{...options, ...propEsplicite}` e assegnano ogni chiave come proprietà.
- Le chiavi sparite tra due render vengono impostate a `undefined`.
- Un `false` esplicito si assegna sempre come proprietà. Oggi viene perso in src/react/index.ts:258-260 e in src/angular/mini-chart.directive.ts:35-40.
- In SSR i primitivi diventano attributi e json/colorList diventano stringhe JSON.

**Budget e punti di aggancio**
- Lo strato options pesa ≤ 1 KB min+gz (size-limit). I suggerimenti per la UI non entrano mai nello schema runtime: stanno in `<tag>.docs.ts`.
- Nuove righe nella tabella di §3.11:
  - `resolveOptions()` + store del registry (1.6), che servono `ChartElement` (1.10), il compat 2.x e l'SSR 2.1;
  - `DefineMiniChartsOptions` (1.6), a cui si agganciano `legacy`, `prefix` e `compat`.

---

### 3.13 Sito docs + demo (`apps/docs`, 1.7-1.12)

**Stack e principi**
- **Stack:** Astro + Starlight in `apps/docs`. Il pacchetto workspace è privato e non è un pacchetto pubblicato.
- **Consumo della libreria:** `sparkline-mini-charts: workspace:*` tramite gli `exports` (dist), sia in dev sia in build; in dev il core gira con `build --watch`. Il sito non importa mai da `src`: oggi dev e produzione eseguono build diversi (demo/app.js:3, vite.config.demo.js:9-54, package.json `sideEffects`).
- **Dogfooding:**
  - preset `themes/*.css` e token, con un ponte verso Starlight;
  - API di configurazione (P3-8), usata dal configuratore;
  - template degli esempi (P4-3), usati per l'export del codice;
  - wrapper (P5) nelle ricette.
- **Contenuti generati:** nessuna tabella API e nessuno snippet si scrivono a mano. Le uniche fonti sono `chart-meta.json`, gli esempi di P4-3 e `tokens.json`.
- **JavaScript:** zero di default. Lo usano solo le 3 isole e lo script di registrazione.

**Fonti dati (`src/content.config.ts`)**

| Collection | Loader | Contenuto | Da |
|---|---|---|---|
| `docs` | `docsLoader` di Starlight, schema esteso con il frontmatter `chart?` | guide, stub MDX dei chart | P4-5 |
| `charts` | loader Content Layer custom | `tools/codegen/generated/chart-meta.json` | P4-6 |
| `examples` | glob | esempi type-checked di P4-3, per chart e per framework | P4-6 |
| `tokens` | file | `tokens.json` (P7-2: livelli, default light e dark, consumatori, alias vecchio → nuovo). Prima: `schema.tokens` più il tipo dedotto dalla regola di naming di §3.8 | P4-6 / P8-9 |

**`chart-meta.json`**
- È un superset del CEM, generato da `tools/codegen` e non pubblicato.
- Il CEM resta per gli IDE. Il sito legge `chart-meta.json` perché il CEM non ha min, max, values e i suggerimenti per la UI.
- Per ogni chart contiene:
  - `tag`, `slug`, `name`, `summary`, `category`, `family`, `aspectRatio`, `since`;
  - `props[]`: `name`, `attribute`, `type`, `values`, `min`, `max`, `step`, `range`, `default`, `autoLabel`, `group`, `order`, `control`, `since`, `deprecated`, `tokenChannel`, `instanceOnly`;
  - `events[]` con le chiavi del detail e i nomi di binding per framework (§3.5);
  - `parts[]` e `tokens[]`;
  - `data`: `tsInput`, normalizzatore, generatore, CSV;
  - `examples[]`: `{ id, title, data, options, tokens? }`;
  - `edgeCases[]` e `related[]`.

**Mappa del sito**

| Path | Contenuto | Fonte | Fase |
|---|---|---|---|
| `/` | Splash con chart live in contesti reali (riga di tabella KPI, card, tile della dashboard). Comando d'installazione con `<Tabs syncKey="pkg">`. Percorso in 3 passi: installa → registra → primo chart. Striscia della gallery | scritto a mano + esempi | P4-5 (striscia in P4-6) |
| `/getting-started/{installation,first-chart,sizing-and-layout,registration}/` | guide | docs/getting-started.md, README | P4-5 |
| `/frameworks/{vanilla,react,vue,angular,svelte,solid,preact,lit,astro,qwik}/` | ricette con il livello 1/2/3 di §3.9 | docs + P5-4 | P4-5 → P5-4 |
| `/charts/` | gallery generata e raggruppata per `category`, con filtro | `charts` | P4-6 |
| `/charts/<slug>/` ×17 | pagina del chart generata; configuratore da P5-5 | `charts` + `examples` | P4-6, P5-5 |
| `/guides/configuration/` | precedenza D16; `options`, `preset` e `defaults` in 6 framework | template P4-3 | P4-6 |
| `/guides/{data,events,accessibility}/` | normalizzatori e `DataIssue`; contratto eventi; a11y | generati + prosa | P6-10, P4-6, P9-3 |
| `/playground/` | configuratore a tutto schermo con selettore dei chart | `<smc-configurator>` | P5-5 |
| `/live/` | board di dati live (ricetta streaming) | `<smc-live-board>` | P5-6 |
| `/theming/{,tokens,parts,presets,gradients}/` | provvisorio: tabelle generate dallo schema e guida ai livelli corretta | schema | P4-6 |
| `/theming/studio/` | theme studio | `<smc-theme-studio>` | P8-9 |
| `/reference/{elements,events,math,theme-api,types,browser-support}/` | reference generata | CEM, P6-9, P8-8 | P4-6 → P9-3 |
| `/guides/migration-2-0/`, `/changelog/`, 404 | migrazione e changelog | deprecazioni, CHANGELOG | P9-3, P4-5 |

**Template della pagina chart (ordine fisso, componente `ChartPage`)**
1. Header: nome canonico, tag, categoria, famiglia, `since`, peso gzip da size-limit, link al sorgente e a npm.
2. Anteprima e configuratore (Preview | Code). Prima di P5-5: anteprima statica con una striscia di varianti per ogni prop enum.
3. Import: foglia `/define` dopo P9-1, poi tab per framework (`syncKey="framework"`).
4. Data: forma canonica e tipo TS da `tsInput`. Le forme legacy compaiono solo in una nota "legacy".
5. Esempi (P4-3).
6. Tabella delle prop: attributo, proprietà, tipo, default, valori o range, reflect, since, alias deprecato → canonico, canale token, solo istanza.
7. Eventi, con i nomi di binding per React, Vue, Angular, Svelte e Solid.
8. Part.
9. Token per livello.
10. Accessibilità: ruolo e tabella della tastiera (prima di P7-4 è indicato "solo puntatore").
11. Edge case live: vuoto, singolo, piatto, negativi, buchi, grande.
12. Deprecazioni e migrazione.
13. Chart correlati e prev/next.

**Componenti condivisi (zero JS)**
- `ChartStage`: box ricavato da `aspectRatio` più `preupgrade.css` (P4-2), così non c'è layout shift. Sostituisce le 3 liste di dimensioni per tag scritte a mano (index.html:666-693, 763-790, 1190-1204).
- `ChartPreview`.
- Tabelle: `PropsTable`, `EventsTable`, `PartsTable`, `TokensTable`.
- `DataShape`.
- `ExampleTabs`: Starlight `<Tabs syncKey="framework">` + Expressive Code, con il pulsante di copia incluso.
- `ChartCard` / `ChartGallery`: anteprima, nome e una riga di descrizione. Niente codice nella card e niente altezze fisse.
- `VersionBadge`, che legge `package.json` a build time.
- `FrameworkMatrix`.
- `StatusRegion`: una regione `polite` per pagina.

**Isole (D15)**
- **Registrazione:** uno `<script>import 'sparkline-mini-charts/register'</script>` in bundle, in un override di `Head`. Dopo P9-1, ogni pagina importa solo le foglie `mini-<x>-chart/define` che usa.
- **`<smc-configurator tag mode="embedded|playground">`:** descritto sotto.
- **`<smc-theme-studio>` (P8-9):**
  - i preset si applicano con classe o `data-theme` su un contenitore di anteprima (oppure con `<mini-chart-theme>` dopo P8-8), mai con scritture inline per elemento;
  - i controlli vengono da `tokens.json`;
  - l'export usa `themeToCSS`.
- **`<smc-live-board>` (P5-6):**
  - un solo scheduler su rAF;
  - IntersectionObserver per ogni card più `visibilitychange`;
  - in pausa di default con `prefers-reduced-motion`;
  - dati assegnati con `el.data = array` e `reflectData: false`;
  - pulizia con un `AbortController`.

**Architettura del configuratore**

*Stato.* Un solo store, con questa forma:
```ts
interface ConfiguratorState<T extends ChartTag> {
  tag: T;
  options: Partial<ChartOptionsMap[T]>;           // solo le differenze dal default
  tokens: Record<`--mini-${string}`, string>;     // applicati allo stage, mai al sito
  data: { example: string } | { inline: unknown };
  framework: 'html' | 'react' | 'vue' | 'angular' | 'svelte' | 'solid';
  stage: { size: 80 | 160 | 320 | number; bg: 'light' | 'dark'; context: 'card' | 'row' | 'inline' };
}
```

*Come usa l'API della libreria (dogfooding di P3-8).*
- L'anteprima è un solo elemento, aggiornato con `el.options = state.options` e `el.data = …`; non viene mai ricreato.
- L'inspector mostra `resolvedOptions()` e `optionSource()` per ogni chiave.

*Controlli per tipo di prop*

| PropType | Controllo |
|---|---|
| `number` con min e max | slider più input numerico collegato; `step` da `docs.ts` |
| `number` senza limiti, o con `default: undefined` | input numerico più uno switch "auto" che azzera il valore e mostra `autoLabel` |
| `boolean` | `<input type=checkbox role=switch>`, con uno stato "non impostato" quando è attivo un default di registry |
| `enum` | gruppo radio segmentato fino a 4 valori, altrimenti `<select>` |
| `string` | campo di testo |
| `angle` | slider da -360 a 360 (passo 1, aggancio a 15°) con il valore in gradi |
| `json` (zones, ranges) | editor monospaziato con validazione, formattazione ed errori inline (`aria-invalid` + `aria-describedby`) |
| `colorList` (e `string[][]` della radial-bar) | lista di stop, ciascuno con color picker e campo di testo. Accetta qualsiasi colore CSS, `var()` e oklch, validato con `CSS.supports`. Pulsanti aggiungi, rimuovi, su e giù, ciascuno con nome accessibile (niente solo drag). Barra del gradient live. Emette solo la sintassi canonica, mai lo pseudo-JSON con apici singoli |

*Pannelli*
- **Opzioni:** `fieldset`/`legend` per gruppo. Ogni controllo modificato mostra la parola "modificato" (non solo un colore) e ha un proprio reset; c'è anche un reset globale.
- **Data:** editor JSON, e CSV per le serie piatte. Generatori per tipo di normalizzatore (10, non 17). Gli esempi di `docs.ts` fanno da preset.
- **Token:** solo i `schema.tokens` del chart, poi `tokens.json`.
- **Eventi:** listener per ogni evento dello schema. Massimo 50 voci, con pausa e svuota. `role=log`, annunci solo su richiesta, hover limitato.
- **Inspector:** valori risolti e livello di provenienza per ogni chiave.
- **Codice:** template isomorfi di P4-3.
  - Formati: html (attributi + JSON), html con CSV, tsx raw, wrapper React, Vue, Angular, Svelte, Solid, oggetto `options`, chiamata `defineChartPreset(...)`, blocco CSS dei token (`themeToCSS` dopo P8-8).
  - Di default esporta solo i valori modificati; un toggle "includi i default" mostra anche gli altri.

*URL*
- Parametri: `?o=<base64url(diff JSON)>&t=<diff token>&d=<id esempio | dati>&fw=react`.
- Scrittura: `history.replaceState` con debounce di 300 ms.
- Oltre 2 KB i dati ricadono su un id di esempio o su CSV.
- Al caricamento tutto si rivalida con lo schema; le chiavi sconosciute si scartano con un avviso.
- Niente `eval`; il codice si rende con `textContent`.

*Accessibilità*
- Controlli nativi con `<label for>`. Descrizione, default e deprecazione collegati con `aria-describedby`.
- Tutto è utilizzabile da tastiera con focus visibile.
- La conferma di copia passa da `role=status`.
- Rispetta reduced motion.

*Prestazioni*
- L'isola si monta `client:visible`.
- JS proprio ≤ 25 KB gz.
- Gli eventi di hover del log sono limitati.

**Design system a 3 livelli**
- **L1 · Preset della libreria, usati così come sono:**
  - prima di P8-7: i token legacy;
  - da P8-7: `themes/auto.css` di default, più l'opzione "Alto contrasto" con `themes/high-contrast.css` (automatica con `prefers-contrast: more`);
  - il sito non dichiara alcun `--mini-chart-*` proprio.
- **L2 · `site-bridge.css`, circa 40 righe:**
  - ricava `--sl-color-accent`, `-accent-low` e `-accent-high`, `--sl-color-text`, `--sl-color-bg`, `--sl-color-gray-1..6` e l'anello di focus dai token di livello 1 e 2 (`--mini-chart-color`, `surface`, `foreground`, `muted`, `grid`, `focus-ring`) con `color-mix(in oklab, …)`;
  - cambiare preset ricolora insieme chrome e chart: è la prova che i token bastano per una UI reale;
  - regola: nessuna variabile senza prefisso. Oggi `--primary` e `--surface` del sito filtrano dentro bullet e scatter (index.html:62-70).
- **L3 · Preset showcase:** ocean, emerald, cyberpunk, sunset e velvet diventano `themes/showcase/*.css`, con soli token di livello 1 e 2 in coppie `light-dark()`, verificati da palette-check (P8-7).
- **Scale:**
  - testo, spazi e raggi di Starlight, con pesi 400, 600 e 700;
  - un solo font variabile self-hosted con Fontsource (via Google Fonts, index.html:14-19);
  - z-index con nomi (nav, drawer, toast);
  - transizioni del sito su `--mini-chart-duration` e `--mini-chart-easing`, azzerate con reduced motion;
  - niente `backdrop-filter` sulle card ripetute.
- **Modalità:**
  - Auto (default), Light e Dark, applicate da uno script inline nell'head prima del primo paint, quindi senza flash;
  - un blocco `forced-colors` mappa gli stati attivi su `Highlight`/`HighlightText`.
- **Icone:** set Starlight `<Icon>`, con `aria-hidden` sulle decorative. Niente emoji nella chrome.

**Redirect dalla demo legacy.** Gli hash non arrivano al server, quindi lo shim è uno script inline su `/` che usa `location.replace`.

| Hash vecchio | Destinazione |
|---|---|
| `#/overview`, vuoto | `/` |
| `#/streaming` | `/live/` |
| `#/components` | `/charts/` |
| `#/components/mini-<x>-chart` | `/charts/<x>/` (un tag sconosciuto porta a `/charts/`) |
| `#/playground` | `/playground/` |
| `#/theming` | `/theming/`, poi `/theming/studio/` da P8-9 |
| `#/gradients` | `/theming/gradients/` |
| `#/frameworks` | `/frameworks/` |

**Budget (D19) e gate in CI**

| Ambito | Budget | Gate |
|---|---|---|
| Conformità | WCAG 2.2 AA | axe (`@axe-core/playwright`): 0 violazioni serious o critical su ogni pagina, in light, dark, forced-colors e reduced-motion |
| Tastiera | skip link; drawer `inert` quando è chiuso, con ritorno del focus; tab con le frecce; ogni controllo del configuratore raggiungibile; `scroll-padding-top` sotto l'header sticky (2.4.11) | passaggio Playwright scriptato |
| Reflow e testo | nessuno scroll orizzontale a 320, 768 e 1280 px; testo al 200% senza tagli; niente altezze fisse né clamp | Playwright (viewport e zoom) |
| Contrasto | testo ≥ 4,5:1; UI e segni ≥ 3:1, in entrambi gli schemi, per il bridge e i preset showcase | palette-check (P8-7); prima, uno script sul bridge |
| Movimento | niente autoplay con reduced motion; board live in pausa quando è nascosta o fuori schermo | Playwright `emulateMedia`, contatore delle scritture |
| JavaScript | ≤ 60 KB gz per pagina esclusi i moduli chart; configuratore ≤ 25 KB gz; guide senza isole | script sull'output del build |
| Core Web Vitals (Lighthouse mobile) | Performance ≥ 90, Accessibility 100, LCP ≤ 2,0 s, CLS ≤ 0,05, TBT ≤ 200 ms | Lighthouse CI sui template home, chart, playground e theming |
| Rete | 0 richieste a terze parti; ≤ 2 file di font | log delle richieste in Playwright |
| Robustezza | 0 errori in console su ogni route; 0 link rotti | smoke Playwright, link checker |

**Deploy e CI**
- **Prima del cutover:** il dominio di produzione serve ancora la demo legacy (`apps/demo`). `apps/docs` gira su un secondo progetto Vercel, con un'anteprima per ogni PR e il sottodominio `next.`.
- **Dal cutover (P5-6):** il dominio passa ad `apps/docs`, senza rewrite catch-all.
- **Workflow `docs.yml`:** `astro check`, build, i gate della tabella sopra, `codegen --check` (stub MDX e `chart-meta.json`).
- **Screenshot del README:** li rigenera uno script Playwright sul sito, in light e dark, e il README li include con `<picture>`.