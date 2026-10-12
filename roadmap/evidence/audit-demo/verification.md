**P1 · 1.4.2 (aggiunte)**
- Comandi:
  ```bash
  pnpm build && pnpm build:demo && pnpm exec playwright test test/e2e
  ```
  Eseguono lo smoke sulle 8 route (console pulita, 17 tag definiti) e axe sulle 8 viste in light e dark. Coprono anche i viewport 320 e 375 senza scroll orizzontale, il contatore delle scritture `data` a 0 in un tab nascosto e con reduced motion emulato.
- Regressioni volute in una PR di prova:
  - reintrodurre `initApp` fa fallire lo smoke;
  - reintrodurre `endpoint=` fa fallire `check-docs`.
- Verifiche manuali:
  - drawer e tab con VoiceOver o NVDA;
  - playground con una label personalizzata;
  - theming lab dopo "Cyberpunk" più uno slider.

**P2 · 1.5.0**
- `pnpm --filter demo build` senza il dist del core fallisce con un errore esplicito.
- Smoke legacy verde dal path `apps/demo`.
- Nel build della demo non ci sono `.map`, `.cjs` né `.d.ts` della libreria.

**P3 · 1.6.0**
- La suite di contratto contiene la matrice di precedenza generata: 6 livelli, alias, `false` esplicito, sostituzione di `options`, ordine dei preset.
- Test in browser mode:
  - registry diversi tra pagina e iframe;
  - wrapper React importato prima di `configureMiniCharts`;
  - un solo render per chart dopo un cambio di default.
- `size`: strato options ≤ 1 KB min+gz; schemi runtime ancora sotto 2,5 KB.
- Il build di produzione di una fixture consumer non contiene stringhe di warning (P3-10). `endpoint="last"` avverte una volta in dev.
- `api:check`: solo aggiunte (`options`, `preset`, `resolvedOptions`, `optionSource`, `configureMiniCharts`, `defineChartPreset`). `defineMiniCharts(customElements)` resta compatibile.

**P4 · 1.7.0**
- `codegen --check` copre anche `chart-meta.json` e i 17 stub MDX.
- `test:types`:
  - `defaults: { 'mini-line-chart': { curve: 'smoth' } }` deve fallire;
  - gli esempi generati dai template isomorfi passano tsc, vue-tsc, ngc e svelte-check.
- I template degli snippet girano in happy-dom senza globali Node.
- Workflow `docs.yml` su `apps/docs`:
  - `astro check` e build;
  - smoke su ogni route;
  - axe in light, dark, forced-colors e reduced-motion;
  - viewport 320, 768 e 1280;
  - link checker;
  - Lighthouse CI con i budget di D19;
  - nessuna richiesta verso terze parti.
- PR di prova: una prop finta aggiunta a uno schema compare in tabella, nei tipi e negli esempi con un solo `pnpm codegen`.

**P5 · 1.8.0**
- Matrice adapter estesa: `options` e `false` esplicito con React 18.3/19 (SSR e idratazione), Vue SSR e Angular TestBed.
- Configuratore:
  - test di contratto: ogni prop ha un controllo;
  - round-trip: codice esportato → fixture → stessi `resolvedOptions()`;
  - un URL condiviso riproduce lo stato;
  - passaggio da tastiera scriptato;
  - JS ≤ 25 KB gz.
- `/live/`: contatore delle scritture a 0 con il tab nascosto e con la board fuori schermo; con reduced motion parte in pausa.
- Cutover:
  - test Playwright della tabella dei redirect;
  - smoke di produzione sul dominio;
  - nel repo non resta alcun riferimento a `demo/`;
  - screenshot del README rigenerati.

**P6 · 1.9.0**
- `[1,"x",3]` nell'editor del configuratore mostra un issue `not-finite` all'indice 1.
- La tabella dei normalizzatori è generata e controllata da `codegen --check`.

**P8 · 1.11.0**
- palette-check su `site-bridge.css` e sui 5 preset showcase, in light e dark: soglie di contrasto e simulazione CVD.
- Baseline forced-colors degli stati attivi del sito.
- Theme studio:
  - il CSS esportato, incollato in una fixture, produce la stessa baseline visiva;
  - cambiare un controllo non resetta il preset;
  - axe e gate D19 su `/theming/*`.

**P9 · 1.12.0**
- Build delle docs versionate (v1.x e `next`) con i gate D19 verdi su entrambe.
- Ogni pagina chart carica un solo modulo chart (controllo sull'output del build).
- Protocollo manuale con screen reader di P7-4 eseguito sul sito: configuratore, theme studio e board live.
- Link checker verde; nessuna tabella API scritta a mano.