# Diagnostica e Migliorie: `<mini-stream-chart>`

> **File Sorgente**: [`src/components/mini-stream-chart.js`](file:///home/erlonrru/Documenti/Projects/Personal/sparkline-mini-charts/src/components/mini-stream-chart.js)  
> **Data Revisione**: 14 Agosto 2026  
> **Stato Attuale**: Funzionante con layout simmetrico ThemeRiver (`offset: "silhouette"`) e maschera di wipe.

---

## 🔍 1. Diagnostica del Codice Attuale

### ⚠️ Criticità Identificate
1. **Interpolazione lineare anziché curve fluide (Spline/Bézier)**:
   - Con pochi punti, i comandi `L` generano spigoli acuti, compromettendo la fluidità organica tipica dello streamgraph.
2. **Palette CSS limitata a sole 4 serie**:
   - Serie oltre la quarta rimangono prive di fill.
3. **Timer & Frame di animazione non tracciati**:
   - Doppio `requestAnimationFrame` senza ID e senza rimozione in `disconnectedCallback`.
4. **Mancanza di supporto a `@media (prefers-reduced-motion: reduce)`**.

---

## 🎛️ 2. Specifiche Avanzate dei Parametri (Standard 2026)

### A. Parametri di INPUT (Attributi & Proprietà)
| Parametro | Tipo / Valori | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `data` | `number[][] \| string` | `[]` | Array 2D di flussi numerici. |
| `curve` | `"smooth" \| "linear"` | `"smooth"` | Smoothing organico con curve Bézier/Spline per effetto "ThemeRiver" autentico. |
| `offset` | `"silhouette" \| "wiggle" \| "expand"` | `"silhouette"` | Algoritmo di distribuzione simmetrica dell'asse centrale. |
| `interactive` | `boolean` | `false` | Abilita l'evidenziazione e l'emissione del flusso hoverato. |

### B. Parametri di OUTPUT (Eventi & A11y)
| Evento / Output | Tipo Evento | Payload (`e.detail`) | Descrizione |
| :--- | :--- | :--- | :--- |
| `sparkline-hover` | `CustomEvent` | `{ index: number, layerIndex: number, value: number, totalVolume: number }` | Emesso al passaggio del cursore su un flusso. |
| `sparkline-leave` | `CustomEvent` | `void` | Emesso all'uscita dal grafico. |
| `role="img"` | Attributo | `aria-label="${label}"` | Etichetta per screen reader. |

### C. Customizzazione CSS & Shadow Parts
- **CSS Variables**:
  - `--mini-chart-color-1` ... `--mini-chart-color-8`: Palette per ciascun flusso.
  - `--mini-chart-canvas`: Colore del contorno di separazione dei flussi (default: `transparent`).
  - `--mini-chart-layer-opacity`: Opacità generale dei flussi (default: `0.9`).
- **Shadow Parts**: `part="layer"`, `part="layer-0"`, `part="layer-1"`, `part="mask-line"`.

### D. Motion Design & Tipologie di Animazione
- **Entrance**: `mask-wipe` orizzontale continuo.
- **Update**: Transizione fluida organica dei percorsi d'onda.
- **Reduced Motion**: Disattivazione transizioni con `@media (prefers-reduced-motion: reduce)`.

---

## 🚀 3. Piano di Refactoring & Migliorie

- [ ] Implementare algoritmo di spline smoothing in `geometry.js` per streamgraph.
- [ ] Integrare `palette.js` per supportare serie illimitate.
- [ ] Pulizia rAF in `disconnectedCallback`.
- [ ] Aggiungere supporto a `prefers-reduced-motion`.
