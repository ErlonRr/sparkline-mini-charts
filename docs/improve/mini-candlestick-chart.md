# Diagnostica e Migliorie: `<mini-candlestick-chart>`

> **File Sorgente**: [`src/components/mini-candlestick-chart.js`](file:///home/erlonrru/Documenti/Projects/Personal/sparkline-mini-charts/src/components/mini-candlestick-chart.js)  
> **Data Revisione**: 14 Agosto 2026  
> **Stato Attuale**: Funzionante con wick (`<line>`) e body (`<rect>`), caching dei nodi e styling condizionale bullish/bearish.

---

## 🔍 1. Diagnostica del Codice Attuale

### ⚠️ Criticità Identificate
1. **Assenza di Animazione d'Ingresso Staggered**:
   - Al primo montaggio le candele compaiono istantaneamente o saltano, a differenza degli altri grafici a barre/linee.
2. **Mancanza di supporto a `@media (prefers-reduced-motion: reduce)`**:
   - Le transizioni `all 0.4s ease-out` su wick e body rimangono attive senza controllo di accessibilità.
3. **Flessibilità del Fill delle Candele**:
   - Supportare sia lo standard giapponese (bullish cava, bearish piena) che lo standard occidentale/moderno (entrambe piene con colore solido) tramite opzione/CSS.
4. **Mancanza di eventi interattivi per dati OHLC**.

---

## 🎛️ 2. Specifiche Avanzate dei Parametri (Standard 2026)

### A. Parametri di INPUT (Attributi & Proprietà)
| Parametro | Tipo / Valori | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `data` | `[number, number, number, number][] \| string` | `[]` | Array 2D di tuple `[Open, High, Low, Close]`. |
| `hollow-bullish` | `boolean` | `true` | Se `true`, candela rialzista cava (`fill: transparent`), altrimenti piena. |
| `wick-width` | `number` | `1.5` | Spessore della linea verticale dello stoppino (High-Low range). |
| `gap` | `number` | `0.2` | Spaziatura percentuale tra le candele. |
| `interactive` | `boolean` | `false` | Abilita il cursore con emissione dei dati completi della candela hoverata. |

### B. Parametri di OUTPUT (Eventi & A11y)
| Evento / Output | Tipo Evento | Payload (`e.detail`) | Descrizione |
| :--- | :--- | :--- | :--- |
| `sparkline-hover` | `CustomEvent` | `{ index: number, open: number, high: number, low: number, close: number, isBullish: boolean, change: number, changePercent: number }` | Emesso al passaggio del cursore su una singola candela. |
| `sparkline-leave` | `CustomEvent` | `void` | Emesso all'uscita dal grafico. |
| `role="img"` | Attributo | `aria-label="${label}"` | Etichetta per screen reader. |

### C. Customizzazione CSS & Shadow Parts
- **CSS Variables**:
  - `--mini-chart-bullish-color`: Colore candele rialziste `Close >= Open` (default: `#10b981`).
  - `--mini-chart-bearish-color`: Colore candele ribassiste `Close < Open` (default: `#ef4444`).
  - `--mini-chart-wick-width`: Spessore dello stoppino.
- **Shadow Parts**: `part="candle"`, `part="wick"`, `part="body"`, `part="bullish"`, `part="bearish"`, `part="crosshair"`.

### D. Motion Design & Tipologie di Animazione
- **Entrance**: Crescita verticale dal prezzo Open con ritardo a cascata (`stagger: index * 40ms`).
- **Update**: Transizione fluida su body `y`/`height` e coordinate dello stoppino.
- **Reduced Motion**: Disattivazione transizioni con `@media (prefers-reduced-motion: reduce)`.

---

## 🚀 3. Piano di Refactoring & Migliorie

- [ ] Aggiungere animazione d'ingresso staggered da prezzo Open.
- [ ] Supporto parametro `hollow-bullish` e `gap`.
- [ ] Implementare evento `sparkline-hover` con calcolo automatico di `change` e `changePercent`.
- [ ] Aggiungere supporto a `prefers-reduced-motion`.
