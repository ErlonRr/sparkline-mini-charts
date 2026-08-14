# Diagnostica e Migliorie: `<mini-stacked-area-chart>`

> **File Sorgente**: [`src/components/mini-stacked-area-chart.js`](file:///home/erlonrru/Documenti/Projects/Personal/sparkline-mini-charts/src/components/mini-stacked-area-chart.js)  
> **Data Revisione**: 14 Agosto 2026  
> **Stato Attuale**: Funzionante con layout cumulativo stacked (`y0`/`y1`) e maschera di wipe orizzontale.

---

## 🔍 1. Diagnostica del Codice Attuale

### ⚠️ Criticità Identificate
1. **Palette CSS limitata a sole 4 serie**:
   - Lo stile iniettato definisce selettori `:nth-child(1)` fino a `:nth-child(4)`. Oltre le 4 serie i layer perdono il colore.
2. **Timer & Frame di animazione non tracciati**:
   - Doppio `requestAnimationFrame` senza ID memorizzato e senza cleanup in `disconnectedCallback`.
3. **Mancanza di supporto a `@media (prefers-reduced-motion: reduce)`**.
4. **Mancanza di separazione tra layer adiacenti**:
   - Nessun bordo sottile o opacità differenziata configurabile.

---

## 🎛️ 2. Specifiche Avanzate dei Parametri (Standard 2026)

### A. Parametri di INPUT (Attributi & Proprietà)
| Parametro | Tipo / Valori | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `data` | `number[][] \| string` | `[]` | Array 2D di serie numeriche (es. `[[10,20], [5,15]]`). |
| `curve` | `"linear" \| "smooth"` | `"linear"` | Modalità di interpolazione dei bordi dei layer accumulati. |
| `normalize` | `boolean` | `false` | Se `true`, converte i dati in stacked 100% (part-to-whole normalizzato a 100%). |
| `min` / `max` | `number` | `auto` | Blocca i limiti verticali del dominio cumulativo. |
| `interactive` | `boolean` | `false` | Abilita l'evidenziazione del singolo layer al passaggio del mouse. |

### B. Parametri di OUTPUT (Eventi & A11y)
| Evento / Output | Tipo Evento | Payload (`e.detail`) | Descrizione |
| :--- | :--- | :--- | :--- |
| `sparkline-hover` | `CustomEvent` | `{ index: number, layerIndex: number, value: number, total: number }` | Emesso al passaggio del cursore su un punto o layer. |
| `sparkline-leave` | `CustomEvent` | `void` | Emesso all'uscita dal grafico. |
| `role="img"` | Attributo | `aria-label="${label}"` | Etichetta per screen reader. |

### C. Customizzazione CSS & Shadow Parts
- **CSS Variables**:
  - `--mini-chart-color-1` ... `--mini-chart-color-8`: Colori dei layer con fallback ciclico su `palette.js`.
  - `--mini-chart-layer-stroke`: Colore del bordo di separazione tra layer (default: `var(--mini-chart-canvas, transparent)`).
  - `--mini-chart-layer-stroke-width`: Spessore del bordo (default: `0.5px`).
- **Shadow Parts**: `part="layer"`, `part="layer-0"`, `part="layer-1"`, `part="mask-line"`.

### D. Motion Design & Tipologie di Animazione
- **Entrance**: `mask-wipe` orizzontale sincronizzato su tutti i layer.
- **Update**: Transizione di morphing del path `d` per ogni singolo layer.
- **Reduced Motion**: Disattivazione transizioni e svelamento istantaneo con `@media (prefers-reduced-motion: reduce)`.

---

## 🚀 3. Piano di Refactoring & Migliorie

- [ ] Supportare serie arbitrarie ($N > 4$) integrando `palette.js` (`getSegmentColor`).
- [ ] Pulizia rAF in `disconnectedCallback`.
- [ ] Aggiungere supporto a `prefers-reduced-motion`.
- [ ] Integrare parametro `normalize` (stacked 100%) e curve smussate.
