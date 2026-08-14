# Diagnostica e Migliorie: `<mini-radial-bar-chart>`

> **File Sorgente**: [`src/components/mini-radial-bar-chart.js`](file:///home/erlonrru/Documenti/Projects/Personal/sparkline-mini-charts/src/components/mini-radial-bar-chart.js)  
> **Data Revisione**: 14 Agosto 2026  
> **Stato Attuale**: Funzionante con anelli concentrici (activity rings) a 270° e supporto per colori personalizzati per barra.

---

## 🔍 1. Diagnostica del Codice Attuale

### ⚠️ Criticità Identificate
1. **Layout Thrashing su Anelli Multipli**:
   - `fg.getBoundingClientRect()` invocato dentro il loop `forEach` per ciascun anello.
2. **Timer multipli orfani**:
   - `setTimeout` e `requestAnimationFrame` multipli non tracciati e privi di cleanup in `disconnectedCallback`.
3. **Visibilità con valore 0 e `stroke-linecap="round"`**:
   - La testa arrotondata del tratto rimane visibile anche a valore zero (appare un pallino); va gestita l'opacità zero su progresso nullo.
4. **Mancanza di supporto a `@media (prefers-reduced-motion: reduce)`**.

---

## 🎛️ 2. Specifiche Avanzate dei Parametri (Standard 2026)

### A. Parametri di INPUT (Attributi & Proprietà)
| Parametro | Tipo / Valori | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `data` | `number[] \| {value: number, color?: string}[] \| string` | `[]` | Array 1D o array di oggetti con colore specifico per anello. |
| `min` / `max` | `number` | `auto` | Valore minimo e scala massima per normalizzare il progresso degli anelli. |
| `sweep` | `number` (gradi) | `270` | Angolo complessivo di rotazione dell'anello (es. `270` gradi o `360` cerchio intero). |
| `round-caps` | `boolean` | `true` | Estremità degli anelli arrotondate (`stroke-linecap="round"`). |
| `interactive` | `boolean` | `false` | Abilita l'evidenziazione dell'anello attivo ed emissione eventi su hover. |

### B. Parametri di OUTPUT (Eventi & A11y)
| Evento / Output | Tipo Evento | Payload (`e.detail`) | Descrizione |
| :--- | :--- | :--- | :--- |
| `sparkline-hover` | `CustomEvent` | `{ trackIndex: number, value: number, percentage: number, color: string }` | Emesso al passaggio del cursore su una traccia concentrica. |
| `sparkline-leave` | `CustomEvent` | `void` | Emesso all'uscita dal grafico. |
| `role="img"` | Attributo | `aria-label="${label}"` | Etichetta descrittiva per screen reader. |

### C. Customizzazione CSS & Shadow Parts
- **CSS Variables**:
  - `--mini-chart-track-bg`: Colore della guida di sfondo vuota (default: `rgba(128,128,128,0.15)`).
  - `--mini-chart-ring-width`: Spessore del tratto degli anelli.
  - `--mini-chart-color-1` ... `--mini-chart-color-8`: Colori fallback per traccia.
- **Shadow Parts**: `part="track"`, `part="track-bg"`, `part="track-active"`.

### D. Motion Design & Tipologie di Animazione
- **Entrance**: Caricamento concentrico ad espansione circolare con stagger (`index * 80ms`).
- **Update**: Transizione fluida su coordinate di apertura arco (`d`).
- **Reduced Motion**: Disattivazione ritardi e transizioni con `@media (prefers-reduced-motion: reduce)`.

---

## 🚀 3. Piano di Refactoring & Migliorie

- [ ] Eliminare reflow nei loop e centralizzare i timer con cleanup.
- [ ] Gestire con precisione la trasparenza su tracce con valore 0.
- [ ] Aggiungere parametro `sweep` (270° / 360°) e supporto `prefers-reduced-motion`.
- [ ] Integrare eventi hover per anello.
