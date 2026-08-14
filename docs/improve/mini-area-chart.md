# Diagnostica e Migliorie: `<mini-area-chart>`

> **File Sorgente**: [`src/components/mini-area-chart.js`](file:///home/erlonrru/Documenti/Projects/Personal/sparkline-mini-charts/src/components/mini-area-chart.js)  
> **Data Revisione**: 14 Agosto 2026  
> **Stato Attuale**: Funzionante con doppio path (linea di contorno + area riempita) e animazione di wipe orizzontale.

---

## 🔍 1. Diagnostica del Codice Attuale

### ⚠️ Criticità Identificate
1. **Timer & Frame di animazione non tracciati**:
   - `requestAnimationFrame` e `setTimeout(..., 850)` non memorizzano ID e non vengono annullati in `disconnectedCallback`.
2. **Mancanza di Gradiente Verticale Nativo**:
   - L'area usa una tinta piatta; le dashboard moderne 2026 richiedono gradienti lineari sfumati (da opaco in cima a trasparente verso il baseline).
3. **Mancanza di supporto a `@media (prefers-reduced-motion: reduce)`**.
4. **Resilienza del morphing su cambio di lunghezza dati**:
   - Sincronizzazione coordinata del path di contorno (`linePath`) e del path chiuso di riempimento (`areaPath`).

---

## 🎛️ 2. Specifiche Avanzate dei Parametri (Standard 2026)

### A. Parametri di INPUT (Attributi & Proprietà)
| Parametro | Tipo / Valori | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `data` | `number[] \| string` | `[]` | Array numerico 1D dei valori. |
| `curve` | `"linear" \| "smooth" \| "step"` | `"linear"` | Modalità di interpolazione della curva superiore dell'area. |
| `gradient` | `boolean` | `true` | Abilita il gradiente sfumato verticale nativo nel `<defs>`. |
| `points` | `"last" \| "min-max" \| "none" \| "all"` | `"last"` | Configurazione dei punti indicatori. |
| `min` / `max` | `number` | `auto` | Controllo scala Y e blocco del dominio. |
| `reference-value` | `number` | `undefined` | Traccia una linea orizzontale tratteggiata di riferimento. |
| `trend-color` | `"auto" \| "none"` | `"none"` | Colora sia la linea che l'area in base al rendimento positivo/negativo. |
| `interactive` | `boolean` | `false` | Abilita scrubbing con crosshair ed emissione eventi. |

### B. Parametri di OUTPUT (Eventi & A11y)
| Evento / Output | Tipo Evento | Payload (`e.detail`) | Descrizione |
| :--- | :--- | :--- | :--- |
| `sparkline-hover` | `CustomEvent` | `{ index: number, value: number, x: number, y: number }` | Emesso durante il trascinamento del cursore. |
| `sparkline-leave` | `CustomEvent` | `void` | Emesso all'uscita dal componente. |
| `role="img"` | Attributo | `aria-label="${label}"` | Accessibilità semantica. |

### C. Customizzazione CSS & Shadow Parts
- **CSS Variables**:
  - `--mini-chart-color`: Colore della linea superiore e del gradiente (default: `#2563eb`).
  - `--mini-chart-stroke-width`: Spessore linea superiore (default: `2px`).
  - `--mini-chart-area-opacity-top`: Opacità superiore del gradiente (default: `0.35`).
  - `--mini-chart-area-opacity-bottom`: Opacità inferiore del gradiente (default: `0.0`).
  - `--mini-chart-fill`: Override per forzare una tinta unita (es. `rgba(...)`).
- **Shadow Parts**: `part="area"`, `part="line"`, `part="point"`, `part="mask-line"`, `part="crosshair"`.

### D. Motion Design & Tipologie di Animazione
- **Entrance**: `mask-wipe` orizzontale a tutta altezza.
- **Update**: Morphing sincronizzato di `line` e `area` con ancoraggio alla baseline.
- **Reduced Motion**: Disattivazione transizioni e svelamento istantaneo con `@media (prefers-reduced-motion: reduce)`.

---

## 🚀 3. Piano di Refactoring & Migliorie

- [ ] Iniettare `<linearGradient>` nel `<defs>` con supporto `--mini-chart-area-opacity-*`.
- [ ] Pulizia sistematica rAF e timer in `disconnectedCallback`.
- [ ] Aggiungere supporto a `prefers-reduced-motion`.
- [ ] Integrare parametri `curve`, `gradient`, `min`, `max`, `interactive`.
