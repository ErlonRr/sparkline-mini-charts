# sparkline-mini-charts: punto della situazione (2026-10-10)

Questo file serve a riprendere il lavoro da una nuova sessione.

## Dove sono le cose

| Cosa | Path |
|---|---|
| Piano completo (97 item, P0 → P10, in italiano) | `roadmap/ROADMAP.md` |
| Evidenze dell'audit della libreria (234 finding, file:riga) | `roadmap/evidence/audit-library/` (`titles.txt` = indice) |
| Audit della demo e della configurazione + correzioni del critico | `roadmap/evidence/audit-demo/` |
| Risultato dettagliato di P0 (implementazione, review, verifica) | `roadmap/evidence/p0-results/p0-workflow-result.json` |
| Codice | repo, branch `fix/1.4.1-stabilize`. **Niente è committato**: 29 file modificati e 24 nuovi |

## Cosa abbiamo fatto

1. **Audit della libreria**, in sola lettura su 9 aree: 234 finding (18 critical, 88 high).
2. **Piano:** tre design valutati da un giudice; vince "stability-first", con le correzioni di un critico.
3. **Estensione del piano** su tua richiesta:
   - refactor UI/UX della demo: sito unico `apps/docs` con Astro Starlight, `demo/` in feature freeze;
   - configurazione per chart: `options`, `preset` e `defaults` di registry nella libreria, più un configuratore generato dallo schema;
   - nuove decisioni D13-D19, nuovi item P1-18/19, P3-8…11, P4-5/6, P5-5a/b, P5-6, P6-10, P8-9.
4. **Fase P0 (hotfix 1.4.1) implementata: 12 item su 12.**
   - CI riordinata, con GitHub Actions su Node 22 e 24 e action pinnate per SHA.
   - Rete di test sul ciclo di vita con happy-dom.
   - Un solo accessor `data` con `parseData()`: niente più TypeError su 9 chart e niente doppia codifica.
   - Parsing sicuro con `null`, error boundary, reduced motion che non altera più i valori, `:host([hidden])`.
   - Wrapper React (18.3 e 19) e Vue corretti, con `'use client'`.
   - Direttiva Angular `@Input()` della 1.3.0 ripristinata.
   - Snippet delle docs corretti, igiene di rilascio, stub `.d.ts` per ogni entry, publint e attw.
   - **Review:** 9 problemi trovati e tutti corretti, tra cui la cleanup dei ref React 19, `hidden="false"` in React 18, `normalize` in SSR e `prepack` che sporcava l'output di `npm pack --json`.
   - **Verifica:** typecheck ok; test:unit 224 pass e 0 fail (34 todo previsti, chiusi da P1-1 e P1-2); test:package 60 pass e 0 fail; lint:package, build e build:demo ok; un checkout pulito senza dist è verde. Sul codice 1.4.0 i check a, b, c, f e g falliscono, sul codice nuovo passano.

## Cosa resta da fare

### Prima, per chiudere la 1.4.1. Sono azioni tue, oppure mie su tua richiesta esplicita
1. Rivedere il diff e decidere se fare un unico commit oppure un commit per item (P0-1…P0-12). Poi push e PR su GitHub, così i check Node 22 e 24 girano una prima volta.
2. Branch protection su `main`: PR obbligatoria, check "Node 22" e "Node 24", niente force-push.
3. Tag retroattivo: `git tag -a v1.4.0 5a9322d && git push origin v1.4.0`. I link del CHANGELOG lo presuppongono.
4. Portare la versione a 1.4.1, trasformare `[Unreleased]` in `[1.4.1]` con data, creare il tag v1.4.1 e fare `npm publish`, dopo un `npm pack --dry-run`.
5. Creare l'org npm `@sparkline-mini-charts` con 2FA.
6. Controlli manuali:
   - in Chrome, con reduced motion emulato, il progress al 30% mostra 30%;
   - build AOT reale della ricetta raw su Angular 20 (diventa un test in P2-7);
   - il runner Forgejo `batcave-node22` ha Node ≥ 22.15 e npm nel PATH, e su un feature branch non fa deploy.

### Decisioni da confermare: sono tutte assunte, non hai mai risposto
- A1-A4: v2.0 con shim, TypeScript, monorepo con `@sparkline-mini-charts/*`, nessun wrapper Svelte.
- D1-D19, in particolare:
  - D2: GitHub `ErlonRr` è il forge canonico; package.json è già stato aggiornato in questo senso;
  - D3: Vercel per la demo;
  - D13: sito unico docs + demo;
  - D14: sito solo in inglese al lancio.

### Stato di P1 (aggiornato il 2026-10-12)
- **Fatto** nel working tree, senza commit, sopra P0: P1-1…P1-13, con tutte le verifiche verdi (399 test unit, 60 test package).
- **Istantanea di P0** prima di P1: `roadmap/evidence/p0-results/p0-tracked.patch` + `p0-untracked.tgz`.
- **Voci per il CHANGELOG e problemi aperti per gruppo:** `roadmap/evidence/p1-changelog-notes.md`.
- **Fatti anche** P1-14…P1-17:
  - docs in entrambe le direzioni (`lint:docs`) e `.d.cts`;
  - Changesets: le voci della 1.4.2 sono 5 changeset in `.changeset/`, le note 1.4.1 restano in `[Unreleased]`;
  - `release.yml` con OIDC e provenance, `api:check` con 24 report in `api/`;
  - Vercel come unico host; la demo carica solo il dist.
- **P1 COMPLETA (2026-10-12): 19 item su 19, più la revisione.** Tre revisori indipendenti, poi un agente ha corretto tutti i rilievi; i report sono in `roadmap/evidence/p1-review/`.
  - **Verifiche finali, tutte verdi:**
    - typecheck, `lint:source`, `lint:docs`;
    - `test:unit` 441 pass, 0 fail, 0 todo (anche da copia pulita senza dist);
    - `test:package` 63 pass;
    - `lint:package`: publint strict e attw senza allowlist su 25 entry × 4 risoluzioni;
    - `api:check`, `build:demo`;
    - `test:e2e` 62 pass, con axe a 0 violazioni serious/critical su 8 viste in chiaro e scuro.
  - **Rimandato a P2-3:** test in browser reale del fallback `initial` (P1-8) e della validazione dei colori nei gradient.
- **RELEASE 1.4.1 (2026-10-12): P0 + P1 in un unico rilascio.**
  - Commit su `fix/1.4.1-stabilize`: `c6494a5` (P0), `549b832` (P1), `44ae1dc` (chore(release): v1.4.1).
  - Tag `v1.4.0` (retroattivo su `5a9322d`) e `v1.4.1`, pushati su GitHub insieme al branch.
  - **NON fatto (servono tue azioni o la tua conferma):**
    1. `npm login`, poi `npm publish --provenance=false` dal tag v1.4.1;
    2. fast-forward di `main` a `44ae1dc` e push. Va fatto **dopo** il publish, così `release.yml` trova la 1.4.1 già pubblicata;
    3. GitHub Release del tag v1.4.1, con le note in `roadmap/evidence/release-notes-v1.4.1.md`.
- **1.4.1 PUBBLICATA (verificato):** npm `latest` = 1.4.1; `main` = a32232c (merge della PR #1 da `fix/1.4.1-stabilize`). Il publish l'ha fatto l'owner a mano. Resta da creare la GitHub Release v1.4.1 (note pronte), se non è già stata fatta.
- **P2:** P2-1 (workspace) completato, in stage e non committato; P2-2 (toolchain) in corso.
- **Decisione dell'owner (2026-10-12):** niente release dopo la sola P2; vuole vedere cambiamenti concreti. Piano: P2 + P3 insieme → release 1.5.0, con una demo dei cambiamenti prima di rilasciare.
- **P2 in corso** su branch `feat/1.5-foundations` (da 44ae1dc). Gruppo 1 = P2-1 (workspace).
- **Prossima fase: P2 (1.5.0).** Workspace pnpm, toolchain, Vitest in browser reale, benchmark, core in TS, pacchetto Angular con ng-packagr. Prima di P2 servono decisioni: conferma di A1-A4 e D13-D19, e la scelta del percorso di rilascio.
- **Release path, decisione tua:**
  - **rilascio combinato:** esce come 1.4.1;
  - **rilasci separati:** 1.4.1 a mano con `--provenance=false`, poi 1.4.2 dalla pipeline. Serve committare P0 separatamente; c'è uno snapshot in `p0-results/`.
  - Dettagli in CONTRIBUTING, sezione "The first release after 1.4.0".
- **Owner actions aggiuntive da P1:**
  - GitHub App per la Version PR: variabile `RELEASE_APP_CLIENT_ID` e secret `RELEASE_APP_PRIVATE_KEY`;
  - autorizzare Actions ad aprire PR;
  - Vercel Deployment Checks.
- **Azioni tue per il rilascio (aggiunte in P1-16 e P1-17):**
  - trusted publisher su npm: repo `ErlonRr/sparkline-mini-charts`, workflow `release.yml`, environment `npm`;
  - GitHub environment `npm`, e Actions autorizzate ad aprire PR;
  - Vercel collegato a GitHub con `ENABLE_EXPERIMENTAL_COREPACK=1` e il dominio puntato su Vercel;
  - scegliere tra rilasci separati 1.4.1 + 1.4.2 (commit divisi) oppure un unico rilascio (la prima Version PR produce 1.4.1). Dettagli nella sezione "Releasing" di CONTRIBUTING.md.

### Prossima fase di sviluppo: P1 (1.4.2)
Fix high senza cambiare l'API: P1-1 (reconnect), P1-2 (render doppio), P1-3…P1-13, poi docs (P1-14), CJS (P1-15), Changesets e provenance (P1-16), demo su Vercel (P1-17), hotfix della demo legacy (P1-18, P1-19).

Note lasciate da P0 per P1:
- in P1-1 il check (e) deve diventare reale su 17 tag, anche line, area e combo (ora todo);
- P1-15 deve togliere `--ignore-rules false-esm` da `lint:package`;
- la doc del gauge dice ancora "numero singolo" mentre il README dice `[value,min,max]`: va allineata in P1-14;
- happy-dom 20.14.6 e `actions/setup-node` v7.1.0 sono usciti 2 giorni fa: valutare un cooldown.

## 2026-10-12 — cambio di rotta: prodotto prima del processo
Su richiesta dell'owner: meno tooling, test e docs, più lavoro visibile. Fatto sul branch `feat/1.5-foundations` (non committato):
1. **API e configurazione:** `static props` per chart → proprietà JS per ogni opzione; `el.options`, `el.preset`, `resolvedOptions()`; `defineMiniCharts({ defaults, presets, reflectData })`, `configureMiniCharts()`, `defineChartPreset()`; detail degli eventi uniforme (`chart, index, seriesIndex, value, datum, color, clientX, clientY`); `pad-angle`, `baseline`, radial `min` e colori win-loss funzionanti.
2. **Reattività:** `el.data = array` senza JSON, `appendData()`, transizioni morbide su tutti i chart (anche Safari), `motion="reduce"`.
3. **Visuale e responsive:** un solo accento, dark mode via `color-scheme`, tratti/punti a pixel costanti, tooltip opzionale, navigazione da tastiera, valore del gauge sotto il perno.
4. **Demo nuova** (`apps/demo/src`): home, gallery, configuratore generato dalle `props` con log eventi ed export codice, live, theming, frameworks; responsive verificato a 320/375/768.
Prossimo: far provare la demo all'owner (`pnpm build && pnpm dev`), poi commit e release 1.5.0.

## 2026-10-12 — 24 chart, tooltip, gauge
- Tooltip verificati in browser reale su tutti i chart; ancore corrette (gauge = punta dell'ago, progress = fine arco, pie = bordo fetta, ecc.), `position: fixed` contro i contenitori con overflow.
- Gauge: niente più numero (show-value deprecato, no-op con warning); click = `sparkline-select`.
- 7 nuovi chart → 24: heatmap, stacked-bar, waterfall, funnel, box-plot, radar, treemap. Registrati ovunque (define, exports, wrapper React/Vue/Angular, demo, docs, API reports).
- compare-pack: i chunk interni con hash fusi dal bundler non contano come rimozioni.
Prossimo: l'owner prova la demo; poi commit e release 1.5.0.
- README riscritto con 8 immagini in assets/img (rigenerabili con `pnpm screenshots`); fix crosshair/active point invisibili in line/area/combo.
