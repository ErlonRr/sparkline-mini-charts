# Diagnostica e Migliorie: `<mini-pie-chart>`

> **File Sorgente**: [`src/components/mini-pie-chart.js`](file:///home/erlonrru/Documenti/Projects/Personal/sparkline-mini-charts/src/components/mini-pie-chart.js)  
> **Data Revisione**: 14 Agosto 2026  
> **Stato Attuale**: Funzionante con settori a 360° e svelamento radiale ad orologio tramite maschera circolare.

---

## 🔍 1. Diagnostica del Codice Attuale

### ⚠️ Criticità Identificate
1. **Timer di animazione orfano**:
   - `setTimeout(..., 850)` per ripristinare la transizione della maschera non è tracciato né rimosso in `disconnectedCallback`.
2. **Forced synchronous reflow**:
   - `maskCircle.getBoundingClientRect()` invocato prima di azzerare `stroke-dashoffset`.
3. **Mancanza di supporto Donut (Inner Radius)**:
   - Moltissime dashboard moderne richiedono la variante **Donut Chart** con foro centrale (per inserire icone o percentuali centrali).
4. **Mancanza di supporto a `@media (prefers-reduced-motion: reduce)`**.

---

## 🎛️ 2. Specifiche Avanzate dei Parametri (Standard 2026)

### A. Parametri di INPUT (Attributi & Proprietà)
| Parametro | Tipo / Valori | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `data` | `number[] \| string` | `[]` | Array numerico 1D (valori non negativi). |
| `inner-radius` / `donut` | `number` (0 a 1) | `0` | Se $> 0$ (es. `0.6`), trasforma il grafico a torta in un **Mini Donut Chart** con foro centrale. |
| `pad-angle` | `number` (gradi) | `0` | Spaziatura angolare tra le fette (gap radiale). |
| `start-angle` | `number` (gradi) | `-90` | Angolo di partenza (default in cima a ore 12). |
| `interactive` | `boolean` | `false` | Abilita l'espansione della fetta hoverata (pop-out) e l'emissione eventi. |

### B. Parametri di OUTPUT (Eventi & A11y)
| Evento / Output | Tipo Evento | Payload (`e.detail`) | Descrizione |
| :--- | :--- | :--- | :--- |
| `sparkline-hover` | `CustomEvent` | `{ index: number, value: number, percentage: number, color: string }` | Emesso al passaggio del cursore su una singola fetta. |
| `sparkline-leave` | `CustomEvent` | `void` | Emesso all'uscita dal grafico. |
| `role="img"` | Attributo | `aria-label="${label}"` | Etichetta accessibile per screen reader. |

### C. Customizzazione CSS & Shadow Parts
- **CSS Variables**:
  - `--mini-chart-gap-color`: Colore del bordo o gap tra le fette (default: `transparent`).
  - `--mini-chart-gap-width`: Spessore del gap tra settori (default: `0.5px`).
  - `--mini-chart-segment-color`: Colore del segmento (fallback su `palette.js`).
- **Shadow Parts**: `part="segment"`, `part="segment-active"`, `part="donut-hole"`, `part="group"`.

### D. Motion Design & Tipologie di Animazione
- **Entrance**: Svelamento orario radiale a 360° con maschera circolare (`stroke-dashoffset`).
- **Update**: Transizione fluida su coordinate angolari dei settori (`d`).
- **Interaction**: Micro-animazione di pop-out della fetta attiva (`transform: scale(1.05)`).
- **Reduced Motion**: Disattivazione transizioni con `@media (prefers-reduced-motion: reduce)`.

---

## 🚀 3. Piano di Refactoring & Migliorie

- [ ] Implementare supporto nativo Donut (`inner-radius`).
- [ ] Tracciare `#timeoutId` e ripulirlo in `disconnectedCallback`.
- [ ] Aggiungere supporto a `prefers-reduced-motion`.
- [ ] Integrare `pad-angle` e micro-interazione hover pop-out.
