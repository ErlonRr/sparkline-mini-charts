# Diagnostica e Migliorie: `<mini-bar-chart>`

> **File Sorgente**: [`src/components/mini-bar-chart.js`](file:///home/erlonrru/Documenti/Projects/Personal/sparkline-mini-charts/src/components/mini-bar-chart.js)  
> **Data Revisione**: 14 Agosto 2026  
> **Stato Attuale**: Funzionante con DOM diffing e transizione staggered delle barre da baseline.

---

## 🔍 1. Diagnostica del Codice Attuale

### ⚠️ Criticità Identificate
1. **Layout Thrashing (Forced Reflows in Loop)**:
   - `rect.getBoundingClientRect()` invocato dentro il loop `forEach` per ogni singola barra: causa N ricalcoli sincroni del layout.
2. **Timer orfani**:
   - `setTimeout(..., 400 + index * 50)` per ogni barra senza tracciamento o cleanup su `disconnectedCallback`.
3. **Mancanza di classi/parti per barre positive e negative**:
   - Viene impostato solo `part="bar"`, impedendo la differenziazione cromatica tra guadagni e perdite (Profit/Loss).
4. **Mancanza di supporto a `@media (prefers-reduced-motion: reduce)`**.

---

## 🎛️ 2. Specifiche Avanzate dei Parametri (Standard 2026)

### A. Parametri di INPUT (Attributi & Proprietà)
| Parametro | Tipo / Valori | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `data` | `number[] \| string` | `[]` | Array numerico 1D con supporto a valori positivi, negativi e nulli. |
| `gap` | `number` | `0.2` | Rapporto di spaziatura tra le barre (es. `0.2` = 20% spazio vuoto). |
| `radius` | `number` | `0` | Raggio di arrotondamento degli angoli delle barre (`rx` / `ry`). |
| `baseline` | `"zero" \| "min"` | `"zero"` | Ancoraggio delle barre: asse zero condiviso o minimo della serie. |
| `min` / `max` | `number` | `auto` | Blocca la scala Y per confronti visivi uniformi in tabelle di metriche. |
| `interactive` | `boolean` | `false` | Abilita il focus/dimming al passaggio del mouse con evento hover. |

### B. Parametri di OUTPUT (Eventi & A11y)
| Evento / Output | Tipo Evento | Payload (`e.detail`) | Descrizione |
| :--- | :--- | :--- | :--- |
| `sparkline-hover` | `CustomEvent` | `{ index: number, value: number, isPositive: boolean, element: SVGRectElement }` | Emesso al passaggio del cursore su una singola colonna. |
| `sparkline-leave` | `CustomEvent` | `void` | Emesso all'uscita del cursore dall'area del grafico. |
| `role="img"` | Attributo | `aria-label="${label}"` | Etichetta descrittiva per screen reader. |

### C. Customizzazione CSS & Shadow Parts
- **CSS Variables**:
  - `--mini-chart-positive-color`: Colore barre positive $\ge 0$ (default: `#10b981`).
  - `--mini-chart-negative-color`: Colore barre negative $< 0$ (default: `#ef4444`).
  - `--mini-chart-color`: Colore di fallback unico per tutte le barre.
  - `--mini-chart-bar-opacity-inactive`: Opacità delle barre non attive durante l'hover (default: `0.35`).
- **Shadow Parts**: `part="bar"`, `part="bar positive"`, `part="bar negative"`, `part="baseline"`.

### D. Motion Design & Tipologie di Animazione
- **Entrance**: `grow-staggered` (crescita verticale da baseline con delay progressivo `index * 30ms`).
- **Update**: Transizione fluida su coordinate `y` e `height`.
- **Interaction**: Focus dimming (la barra hoverata resta al 100% di opacità, le altre sfumano).
- **Reduced Motion**: Disattivazione transizioni e delay con `@media (prefers-reduced-motion: reduce)`.

---

## 🚀 3. Piano di Refactoring & Migliorie

- [ ] Sostituire reflow nei loop con batch reflow unico sull'SVG.
- [ ] Centralizzare e ripulire i timer in `disconnectedCallback`.
- [ ] Assegnare `part="bar positive"` / `part="bar negative"` e attributi `data-positive` / `data-negative`.
- [ ] Integrare parametri `gap`, `radius`, `baseline`, `min`, `max`.
- [ ] Supporto interattività con hover dimming ed evento `sparkline-hover`.
