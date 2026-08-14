# Diagnostica e Migliorie: `<mini-ohlc-chart>`

> **File Sorgente**: [`src/components/mini-ohlc-chart.js`](file:///home/erlonrru/Documenti/Projects/Personal/sparkline-mini-charts/src/components/mini-ohlc-chart.js)  
> **Data Revisione**: 14 Agosto 2026  
> **Stato Attuale**: Funzionante con tick paths a 3 rami (stelo verticale + aletta open a sinistra + aletta close a destra) e animazione d'apertura.

---

## 🔍 1. Diagnostica del Codice Attuale

### ⚠️ Criticità Identificate
1. **Layout Thrashing su Inizializzazione (Reflow in loop)**:
   - `path.getBoundingClientRect()` invocato dentro il loop `forEach` per ogni singola barra tick.
2. **Stile di Transizione Inline Residuo**:
   - `path.style.transition` mantiene il delay inline incrementale (`${index * 0.05}s`) anche per gli aggiornamenti successivi dei dati, rendendo le animazioni disallineate nel tempo.
3. **Mancanza di supporto a `@media (prefers-reduced-motion: reduce)`**.

---

## 🎛️ 2. Specifiche Avanzate dei Parametri (Standard 2026)

### A. Parametri di INPUT (Attributi & Proprietà)
| Parametro | Tipo / Valori | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `data` | `[number, number, number, number][] \| string` | `[]` | Array 2D di tuple `[Open, High, Low, Close]`. |
| `tick-width` | `number` | `1.5` | Spessore del tratto del tick (stelo e alette). |
| `gap` | `number` | `0.2` | Spaziatura tra le barre tick. |
| `interactive` | `boolean` | `false` | Abilita il tracking del cursore con emissione dettagli OHLC. |

### B. Parametri di OUTPUT (Eventi & A11y)
| Evento / Output | Tipo Evento | Payload (`e.detail`) | Descrizione |
| :--- | :--- | :--- | :--- |
| `sparkline-hover` | `CustomEvent` | `{ index: number, open: number, high: number, low: number, close: number, isBullish: boolean }` | Emesso al passaggio del cursore su una singola barra OHLC. |
| `sparkline-leave` | `CustomEvent` | `void` | Emesso all'uscita dal grafico. |
| `role="img"` | Attributo | `aria-label="${label}"` | Etichetta accessibile per screen reader. |

### C. Customizzazione CSS & Shadow Parts
- **CSS Variables**:
  - `--mini-chart-bullish-color`: Colore barre rialziste (default: `#10b981`).
  - `--mini-chart-bearish-color`: Colore barre ribassiste (default: `#ef4444`).
- **Shadow Parts**: `part="bar"`, `part="open"`, `part="close"`, `part="stem"`, `part="bullish"`, `part="bearish"`.

### D. Motion Design & Tipologie di Animazione
- **Entrance**: Apertura progressiva da linea flat a stelo/alette con ritardo a cascata.
- **Update**: Transizione fluida su coordinate dei path `d`.
- **Reduced Motion**: Disattivazione ritardi e transizioni con `@media (prefers-reduced-motion: reduce)`.

---

## 🚀 3. Piano di Refactoring & Migliorie

- [ ] Sostituire reflow nei loop con batch reflow unico sull'SVG.
- [ ] Pulizia sistematica dei delay inline dopo l'animazione d'ingresso.
- [ ] Implementare evento `sparkline-hover`.
- [ ] Aggiungere supporto a `prefers-reduced-motion`.
