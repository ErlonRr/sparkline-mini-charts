# Diagnostica e Migliorie: `<mini-gauge-chart>`

> **File Sorgente**: [`src/components/mini-gauge-chart.js`](file:///home/erlonrru/Documenti/Projects/Personal/sparkline-mini-charts/src/components/mini-gauge-chart.js)  
> **Data Revisione**: 14 Agosto 2026  
> **Stato Attuale**: Funzionante con lancetta reattiva rotante, caching delle zone (`#zonesSignature`) e supporto per zone personalizzate JSON.

---

## 🔍 1. Diagnostica del Codice Attuale

### ⚠️ Criticità Identificate
1. **Disallineamento tra Attributi `min`/`max` e Array `data`**:
   - `min` e `max` vengono letti solo da `data[1]` / `data[2]`, ignorando gli attributi HTML `min="0"` e `max="100"`.
2. **Frame rAF non tracciato sulla lancetta**:
   - `requestAnimationFrame` non salva l'ID per la cancellazione in `disconnectedCallback`.
3. **Forced synchronous reflows**:
   - Invocazione di `.getBoundingClientRect()` sia sulle zone che sulla lancetta.
4. **Mancanza di supporto a `@media (prefers-reduced-motion: reduce)`**.

---

## 🎛️ 2. Specifiche Avanzate dei Parametri (Standard 2026)

### A. Parametri di INPUT (Attributi & Proprietà)
| Parametro | Tipo / Valori | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `data` | `[value, min?, max?] \| [value]` | `[0]` | Array con valore corrente della lancetta (e opzionali min/max). |
| `min` | `number` | `0` | Valore minimo di scala (priorità rispetto al fallback). |
| `max` | `number` | `100` | Valore massimo di scala (priorità rispetto al fallback). |
| `zones` | `string \| {upTo: number, color: string}[]` | `3 bande default` | Configurazione fasce colorate (es. Safe, Warning, Danger). |
| `needle-type` | `"point" \| "line" \| "triangle"` | `"triangle"` | Stile geometrico della lancetta indicatrice. |
| `show-value` | `boolean` | `false` | Visualizzazione testuale del valore sotto il perno centrale. |

### B. Parametri di OUTPUT (Eventi & A11y)
| Evento / Output | Tipo Evento | Payload (`e.detail`) | Descrizione |
| :--- | :--- | :--- | :--- |
| `role="meter"` | Attributo Semantico | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` | Esposizione accessibile. |
| `zone-change` | `CustomEvent` | `{ value: number, zoneIndex: number, zoneColor: string }` | Emesso quando la lancetta entra in una nuova zona di soglia. |

### C. Customizzazione CSS & Shadow Parts
- **CSS Variables**:
  - `--mini-chart-needle-color`: Colore della lancetta e del perno (default: `currentColor` o `#333`).
  - `--mini-chart-safe-color`: Colore della prima fascia (default: `#10b981`).
  - `--mini-chart-warn-color`: Colore della fascia intermedia (default: `#f59e0b`).
  - `--mini-chart-danger-color`: Colore della fascia critica (default: `#ef4444`).
- **Shadow Parts**: `part="needle"`, `part="pivot"`, `part="track"`, `part="zones"`, `part="value-text"`.

### D. Motion Design & Tipologie di Animazione
- **Entrance**: Animazione a cascata staggered sulle zone dell'arco + rotazione lancetta dal minimo.
- **Update**: Rotazione della lancetta con fisica elastica (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
- **Reduced Motion**: Disattivazione transizione con `@media (prefers-reduced-motion: reduce)`.

---

## 🚀 3. Piano di Refactoring & Migliorie

- [ ] Sincronizzare gli attributi HTML `min` e `max` con i dati.
- [ ] Pulizia rAF in `disconnectedCallback`.
- [ ] Implementare evento `zone-change`.
- [ ] Aggiungere supporto a `prefers-reduced-motion`.
