# Diagnostica e Migliorie: `<mini-line-chart>`

> **File Sorgente**: [`src/components/mini-line-chart.js`](file:///home/erlonrru/Documenti/Projects/Personal/sparkline-mini-charts/src/components/mini-line-chart.js)  
> **Data Revisione**: 14 Agosto 2026  
> **Stato Attuale**: Funzionante con animazione mask-wipe ed interpolazione morphing `d`.

---

## 🔍 1. Diagnostica del Codice Attuale

### ⚠️ Criticità Identificate
1. **Memory Leak & Timer non tracciati**:
   - `requestAnimationFrame` annidati e `setTimeout(..., 850)` non salvano ID su campi privati (`#rafId`, `#timerId`).
   - Nessun cleanup eseguito al momento dello smontaggio (`disconnectedCallback`) o su render rapidi concorrenti.
2. **Mancanza di supporto a `@media (prefers-reduced-motion: reduce)`**:
   - Transizione di `d` e stroke-dashoffset della maschera attivi anche su preferenze di riduzione movimento.
3. **Gestione del punto singolo (`data.length === 1`) durante il morphing**:
   - Passando da 1 punto a $N$ punti, `#prevPoints` viene azzerato, causando un salto visivo anziché morphing morbido.
4. **Resilienza della maschera SVG (`id="line-mask"`)**:
   - ID statico; preferibile ID dinamico con prefisso o scoped per evitare collisioni in SVG esportati.

---

## 🎛️ 2. Specifiche Avanzate dei Parametri (Standard 2026)

### A. Parametri di INPUT (Attributi & Proprietà)
| Parametro | Tipo / Valori | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `data` | `number[] \| string` | `[]` | Array numerico 1D dei valori o stringa JSON. |
| `curve` | `"linear" \| "smooth" \| "step"` | `"linear"` | Modalità di interpolazione dei punti (Catmull-Rom / Bézier per `"smooth"`). |
| `points` | `"last" \| "min-max" \| "none" \| "all"` | `"last"` | Configurazione dei punti/pallini indicatori evidenziati sul percorso. |
| `min` | `number` | `auto` | Blocca il limite inferiore dell'asse Y per comparabilità tra sparkline in tabelle. |
| `max` | `number` | `auto` | Blocca il limite superiore dell'asse Y. |
| `reference-value` | `number` | `undefined` | Disegna una linea orizzontale tratteggiata di riferimento (`target` / soglia SLA). |
| `trend-color` | `"auto" \| "none"` | `"none"` | Colora la linea automaticamente di verde se `last >= first`, rosso se `last < first`. |
| `interactive` | `boolean` | `false` | Abilita il tracking del cursore con crosshair e punti magnetici su pointermove/touch. |

### B. Parametri di OUTPUT (Eventi & A11y)
| Evento / Output | Tipo Evento | Payload (`e.detail`) | Descrizione |
| :--- | :--- | :--- | :--- |
| `sparkline-hover` | `CustomEvent` | `{ index: number, value: number, x: number, y: number }` | Emesso durante lo scrubbing col mouse/dito sul punto più vicino. |
| `sparkline-leave` | `CustomEvent` | `void` | Emesso all'uscita del cursore dall'area del grafico. |
| `role="img"` | Attributo | `aria-label="${label}"` | Nome accessibile con fallback dinamico del conteggio valori. |

### C. Customizzazione CSS & Shadow Parts
- **CSS Variables**:
  - `--mini-chart-color`: Colore principale della linea (default: `#2563eb`).
  - `--mini-chart-stroke-width`: Spessore del tratto (default: `2px`).
  - `--mini-chart-point-radius`: Raggio del cerchietto finale (default: `1.75px`).
  - `--mini-chart-point-color`: Colore del cerchietto indicatore (default: `currentColor`).
  - `--mini-chart-ref-color`: Colore della reference line tratteggiata (default: `rgba(128,128,128,0.5)`).
- **Shadow Parts**: `part="line"`, `part="point"`, `part="point-pulse"`, `part="mask-line"`, `part="reference-line"`, `part="crosshair"`.

### D. Motion Design & Tipologie di Animazione
- **Entrance**: `mask-wipe` (default, svelamento orizzontale) o `draw` (`stroke-dashoffset` della linea).
- **Update**: `morph` (interpolazione elastica con matching della lunghezza dei punti).
- **Micro-Interaction**: `pulse` (radar ring trasparente sul punto finale).
- **Reduced Motion**: Disattivazione istantanea via `@media (prefers-reduced-motion: reduce)`.

---

## 🚀 3. Piano di Refactoring & Migliorie

- [ ] Aggiungere gestione `#rafId` / `#timerId` con cleanup su `disconnectedCallback`.
- [ ] Implementare supporto a `@media (prefers-reduced-motion: reduce)`.
- [ ] Integrare attributi `curve="smooth"`, `min`, `max`, `points`, `reference-value`.
- [ ] Implementare crosshair interattivo con evento `sparkline-hover`.
- [ ] Test unitari Vitest su cambi rapidi di stato e rendering edge-case.
