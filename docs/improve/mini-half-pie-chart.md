# Diagnostica e Migliorie: `<mini-half-pie-chart>`

> **File Sorgente**: [`src/components/mini-half-pie-chart.js`](file:///home/erlonrru/Documenti/Projects/Personal/sparkline-mini-charts/src/components/mini-half-pie-chart.js)  
> **Data Revisione**: 14 Agosto 2026  
> **Stato Attuale**: Funzionante con semicerchio superiore a 180° e maschera di svelamento radiale a 180°.

---

## 🔍 1. Diagnostica del Codice Attuale

### ⚠️ Criticità Identificate
1. **Timer di animazione non tracciato**:
   - `setTimeout(..., 850)` non viene memorizzato né ripulito all'eliminazione dell'elemento (`disconnectedCallback`).
2. **Forced synchronous reflow**:
   - `maskCircle.getBoundingClientRect()` eseguito sincronicamente prima della transizione.
3. **Mancanza di supporto a Donut a Semicerchio**:
   - Spesso usato come tachimetro visivo o gauge a settori proporzionali con foro centrale (`inner-radius`).
4. **Mancanza di supporto a `@media (prefers-reduced-motion: reduce)`**.

---

## 🎛️ 2. Specifiche Avanzate dei Parametri (Standard 2026)

### A. Parametri di INPUT (Attributi & Proprietà)
| Parametro | Tipo / Valori | Default | Descrizione |
| :--- | :--- | :--- | :--- |
| `data` | `number[] \| string` | `[]` | Array numerico 1D distribuito su 180°. |
| `inner-radius` / `donut` | `number` (0 a 1) | `0` | Se $> 0$, crea un arco semiradiale a fette con foro centrale. |
| `pad-angle` | `number` (gradi) | `0` | Spaziatura tra i settori del semicerchio. |
| `interactive` | `boolean` | `false` | Abilita l'interattività e l'emissione di eventi su hover. |

### B. Parametri di OUTPUT (Eventi & A11y)
| Evento / Output | Tipo Evento | Payload (`e.detail`) | Descrizione |
| :--- | :--- | :--- | :--- |
| `sparkline-hover` | `CustomEvent` | `{ index: number, value: number, percentage: number, color: string }` | Emesso al passaggio del cursore su una fetta. |
| `sparkline-leave` | `CustomEvent` | `void` | Emesso all'uscita dal componente. |
| `role="img"` | Attributo | `aria-label="${label}"` | Etichetta per screen reader. |

### C. Customizzazione CSS & Shadow Parts
- **CSS Variables**:
  - `--mini-chart-gap-color`: Colore di separazione tra fette.
  - `--mini-chart-segment-color`: Colore specifico segmento.
- **Shadow Parts**: `part="segment"`, `part="segment-active"`, `part="donut-hole"`, `part="group"`.

### D. Motion Design & Tipologie di Animazione
- **Entrance**: Svelamento orario da 180° a 0° con maschera circolare.
- **Update**: Transizione angolare dei percorsi `d`.
- **Reduced Motion**: Disattivazione transizioni con `@media (prefers-reduced-motion: reduce)`.

---

## 🚀 3. Piano di Refactoring & Migliorie

- [ ] Aggiungere supporto a Donut semiradiale (`inner-radius`).
- [ ] Tracciare `#timeoutId` e ripulirlo in `disconnectedCallback`.
- [ ] Aggiungere supporto a `prefers-reduced-motion`.
- [ ] Integrare `pad-angle` ed eventi hover.
