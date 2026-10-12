**Tabella delle fasi (§4)**

| Fase | Versione | Item prima → dopo | Stima prima → dopo (giorni) | Cosa cambia |
|---|---|---|---|---|
| P0 | 1.4.1 | 12 (7S 5M), invariato | 15-25, invariato | — |
| P1 | 1.4.2 | 17 (11S 6M) → **19 (11S 8M)** | 20-30 → **25-39** | + P1-18 (M), P1-19 (M); P1-14 esteso (+0,5-1). Nell'obiettivo: "demo legacy senza errori e accessibile; feature freeze di demo/" |
| P2 | 1.5.0 | 7 (7M), invariato | 16-24 → **16-25** | P2-1 modificato: la demo va in `apps/demo` e si consuma tramite exports. Non c'è un nuovo item |
| P3 | 1.6.0 | 7 (1L 6M) → **11 (1L 8M 2S)** | 21-28 → **27-39** | + P3-8 (M), P3-9 (M), P3-10 (S), P3-11 (S); P3-6 esteso (+1). Obiettivo: "+ configurazione per chart". P3-8…P3-11 possono slittare in 1.7.0 purché arrivino prima di P4-1 |
| P4 | 1.7.0 | 4 (2L 1M 1S) → **6 (3L 2M 1S)** | 15-20 → **24-37** | + P4-5 (M), P4-6 (L); P4-1 e P4-3 estesi (+2-3). Obiettivo: "+ scheletro del sito e pagine dei chart generate" |
| P5 | 1.8.0 | 4 (1L 2M 1S) → **6 (2L 3M 1S)** | 12-17 → **20-33** | + P5-5 (L), P5-6 (M); P5-1 esteso (+1-2). Obiettivo: "+ configuratore e cutover del dominio" |
| P6 | 1.9.0 | 9 (2L 4M 3S) → **10 (2L 4M 4S)** | 24-30 → **25-31** | + P6-10 (S) |
| P7 | 1.10.0 | 7 (5L 2M), invariato | 35-45, invariato | — |
| P8 | 1.11.0 | 8 (1L 5M 2S) → **9 (1L 6M 2S)** | 20-25 → **23-31** | + P8-9 (M); P8-7 esteso (+1-2) |
| P9 | 1.12.0 | 3 (3M), invariato | 8-12 → **9-13** | P9-3 cambia scope: il sito nasce prima, qui si chiude con versioni, migrazione e audit finale |
| P10 | 2.0.0 | 6 (2M 4S), invariato | 7-10, invariato | Testo di P10-4: "il sito `apps/docs` e le fixture passano a `compat:false`" (prima: "demo e fixture") |
| | | **84 (29S 43M 12L) → 96 (32S 50M 14L)** | **circa 195-265 → circa 225-330 (+30-65)** | |

**"Come leggere le stime"**
- Il totale passa a circa 12-15 mesi a tempo pieno, oppure 17-27 mesi part-time.
- Il valore per gli utenti in P0-P5 passa da circa 100-145 a circa 125-200 giorni. Il sito con il configuratore arriva in 1.8, cioè 4 minor prima di quanto previsto da D11.
- Linee di taglio:
  - P8-9 senza export JS (che dipende da P8-8 opzionale);
  - P9-3 ricette e overlay **[rinviabile 2.1]**;
  - il sito non sta nel percorso di rilascio npm, quindi un item del sito può slittare di una minor senza bloccare la libreria.

**Altre sezioni da aggiornare**
- **§2.2:**
  - D11: lo scaffolding del sito si anticipa a 1.7, il cutover a 1.8 e la chiusura resta in 1.12;
  - nuova sottosezione 2.3 con D13-D19.
- **§3.1:**
  - `apps/demo/` esiste solo da 1.5 a 1.8, mentre `apps/docs/` (Astro Starlight) c'è da 1.7;
  - nuovo `tools/codegen/generated/chart-meta.json`, non pubblicato;
  - nel core: `core/options.ts`, `meta/docs-types.ts`.
- **§3.2:** `PropDescriptor` guadagna `instanceOnly?` e `css?`, e diventano riservate le chiavi `options` e `preset`.
- **§3.11:** nuove righe:
  - `resolveOptions()` + store del registry (1.6), usati da `ChartElement`, compat 2.x e SSR 2.1;
  - `DefineMiniChartsOptions` (1.6), a cui si agganciano legacy, prefix e compat.
- **§3:** nuove sottosezioni 3.12 e 3.13.
- **§5:** nota sui finding della demo:
  - bug e blocchi a11y si chiudono in 1.4.2 (P1-18, P1-19);
  - contenuti generati e configuratore in 1.7-1.8 (P4-6, P5-5);
  - streaming e IA al cutover in 1.8 (P5-6);
  - theming della demo in 1.11 (P8-9).
  - Tra i finding della libreria, chart-config-3, -4, -5 e -7 si chiudono in 1.6.
- **§6:** aggiungere i rischi di questo blocco.
- **§7:** aggiungere le verifiche per fase.
- **§8, azioni del proprietario:**
  - confermare D13-D19, in particolare D14 sulla lingua;
  - creare il secondo progetto Vercel con root `apps/docs` e il sottodominio `next.`;
  - al cutover (P5-6), spostare il dominio di produzione su `apps/docs`.