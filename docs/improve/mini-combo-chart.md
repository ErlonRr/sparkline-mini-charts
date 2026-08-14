# Diagnostica e Migliorie: `<mini-combo-chart>`

> **File Sorgente**: [`src/components/mini-combo-chart.js`](file:///home/erlonrru/Documenti/Projects/Personal/sparkline-mini-charts/src/components/mini-combo-chart.js)  
> **Data Revisione**: 14 Agosto 2026  
> **Stato Attuale**: Funzionante con layer combinato (barre in secondo piano + linea in primo piano) su coordinate sincrone.

---

## 🔍 1. Diagnostica del Codice Attuale

### ⚠️ Criticità Identificate
1. **Layout Thrashing su Inizializzazione Barre**:
   - `rect.getBoundingClientRect()` invocato dentro il loop `forEach` per ciascuna barra.
2. **Timer Multipli e Frame rAF non tracciati**:
   - N `setTimeout` per le barre + doppio `rAF` e `setTimeout` per la linea, senza memorizzazione o rimozione in `disconnectedCallback`.
3. **Calcolo Indipendente dei Domini di Scala (Asse Y)**:
   - `createBarLayout` e `createCartesianLayout` calcolano scale verticali disgiunte: se le unità di misura sono le stesse, manca l'opzione per asse unificato condiviso.
4. **Mancanza di supporto a `@media (prefers-reduced-motion: reduce)`**.

---

## 🎛️ 2. Specifiche Avanzate dei Parametri (Standard 2026)

### A. Parametri di INPUT (Attributi & Proprietà)
| Parametro | Tipo / Valori | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `data` | `{ bar: number, line: number }[] \| string` | `[]` | Array di oggetti con valore per la barra e valore per la linea. |
| `shared-domain` | `boolean` | `true` | Se `true`, calcola un dominio globale `[min, max]` condiviso da barre e linea. Se `false`, calcola due assi Y indipendenti. |
| `curve` | `"linear" \| "smooth"` | `"linear"` | Modalità di interpolazione per il layer a linea. |
| `bar-gap` | `number` | `0.2` | Spaziatura tra le barre in background. |
| `points` | `"last" \| "min-max" \| "none" \| "all"` | `"last"` | Configurazione dei punti indicatori sulla linea. |
| `interactive` | `boolean` | `false` | Abilita il cursore con lettura combinata di barra e linea. |

### B. Parametri di OUTPUT (Eventi & A11y)
| Evento / Output | Tipo Evento | Payload (`e.detail`) | Descrizione |
| :--- | :--- | :--- | :--- |
| `sparkline-hover` | `CustomEvent` | `{ index: number, barValue: number, lineValue: number, x: number, y: number }` | Emesso al passaggio del cursore sulla coordinata comune. |
| `sparkline-leave` | `CustomEvent` | `void` | Emesso all'uscita dal grafico. |
| `role="img"` | Attributo | `aria-label="${label}"` | Etichetta per screen reader. |

### C. Customizzazione CSS & Shadow Parts
- **CSS Variables**:
  - `--mini-chart-bar-color`: Colore delle barre di sfondo (default: `rgba(128,128,128,0.3)`).
  - `--mini-chart-color`: Colore della linea in primo piano (default: `#2563eb`).
  - `--mini-chart-stroke-width`: Spessore della linea (default: `2px`).
- **Shadow Parts**: `part="bar"`, `part="line"`, `part="point"`, `part="line-group"`, `part="bars-group"`, `part="crosshair"`.

### D. Motion Design & Tipologie di Animazione
- **Entrance**: Crescita verticale delle barre coordinata con il wipe orizzontale della linea.
- **Update**: Transizione fluida sincronizzata di rettangoli e path `d`.
- **Reduced Motion**: Disattivazione transizioni con `@media (prefers-reduced-motion: reduce)`.

---

## 🚀 3. Piano di Refactoring & Migliorie

- [ ] Sostituire reflow nei loop con batch reflow unico sull'SVG.
- [ ] Centralizzare i timer con cleanup in `disconnectedCallback`.
- [ ] Supportare parametro `shared-domain="true | false"`.
- [ ] Implementare evento `sparkline-hover` combinato.
- [ ] Aggiungere supporto a `prefers-reduced-motion`.
