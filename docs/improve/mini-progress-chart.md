# Diagnostica e Migliorie: `<mini-progress-chart>`

> **File Sorgente**: [`src/components/mini-progress-chart.js`](file:///home/erlonrru/Documenti/Projects/Personal/sparkline-mini-charts/src/components/mini-progress-chart.js)  
> **Data Revisione**: 14 Agosto 2026  
> **Stato Attuale**: Funzionante con semicerchio di progresso, curva elastica bouncy ed attributi ARIA (`role="meter"`).

---

## 🔍 1. Diagnostica del Codice Attuale

### ⚠️ Criticità Identificate
1. **Frame rAF non tracciato**:
   - `requestAnimationFrame` non salva l'ID e non viene cancellato su `disconnectedCallback`.
2. **Forced synchronous reflow**:
   - `valuePath.getBoundingClientRect()` prima del trigger dell'animazione.
3. **Visibilità del cap su valore 0**:
   - Con `stroke-linecap="round"`, a valore zero compare un punto visibile; va gestita l'opacità zero a progresso nullo.
4. **Mancanza di supporto a `@media (prefers-reduced-motion: reduce)`**.

---

## 🎛️ 2. Specifiche Avanzate dei Parametri (Standard 2026)

### A. Parametri di INPUT (Attributi & Proprietà)
| Parametro | Tipo / Valori | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `data` | `[number] \| string` | `[0]` | Array con singolo valore numerico del progresso attuale. |
| `min` | `number` | `0` | Valore minimo della scala di avanzamento. |
| `max` | `number` | `100` | Valore massimo della scala (100% di completamento). |
| `show-value` | `boolean` | `false` | Se `true`, renderizza al centro dell'arco un testo con il valore percentuale o assoluto formattato. |
| `unit` | `string` | `""` | Unità di misura da appendere al valore testuale (es. `unit="%"`, `unit="MB"`). |
| `interactive` | `boolean` | `false` | Emette evento click/hover sul misuratore. |

### B. Parametri di OUTPUT (Eventi & A11y)
| Evento / Output | Tipo Evento | Payload (`e.detail`) | Descrizione |
| :--- | :--- | :--- | :--- |
| `role="meter"` | Attributo Semantico | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` | Esposizione accessibile per screen reader. |
| `progress-complete` | `CustomEvent` | `{ value: number, max: number }` | Emesso quando il progresso raggiunge o supera il valore `max`. |

### C. Customizzazione CSS & Shadow Parts
- **CSS Variables**:
  - `--mini-chart-track-color`: Colore della guida di sfondo (default: `rgba(128,128,128,0.2)`).
  - `--mini-chart-stroke-width`: Spessore dell'arco di progresso (default: `10px`).
  - `--mini-chart-value-color`: Colore dell'arco attivo (default: `currentColor`).
  - `--mini-chart-text-color`: Colore del testo centrale (se `show-value` è attivo).
- **Shadow Parts**: `part="track"`, `part="value"`, `part="text"`.

### D. Motion Design & Tipologie di Animazione
- **Entrance**: Caricamento con rimbalzo elastico (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
- **Update**: Transizione fluida su `stroke-dashoffset`.
- **Reduced Motion**: Rimozione curva elastica e transizione immediata con `@media (prefers-reduced-motion: reduce)`.

---

## 🚀 3. Piano di Refactoring & Migliorie

- [ ] Tracciare `#rafId` e ripulirlo in `disconnectedCallback`.
- [ ] Gestire con precisione l'opacità su valore 0.
- [ ] Aggiungere supporto opzionale a testo centrale (`show-value`, `unit`).
- [ ] Aggiungere supporto a `prefers-reduced-motion`.
