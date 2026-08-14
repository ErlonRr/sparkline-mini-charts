# Specifica di Prodotto & Parametri Avanzati (Standard 2026)

> **Progetto**: Sparkline Mini Charts  
> **Data Revisione**: 14 Agosto 2026  
> **Obiettivo**: Definire lo standard di riferimento per Input, Output, Customizzazione, Styling e Motion Design per l'intera suite di mini-chart.

---

## 🏛️ Architettura Input / Output dei Mini Charts

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           SPARKLINE COMPONENT ARCHITECTURE                        │
├────────────────────────┬─────────────────────────┬────────────────────────────────┤
│       INPUTS (DX)      │    CORE PROCESSING      │      OUTPUTS & EMISSIONS       │
├────────────────────────┼─────────────────────────┼────────────────────────────────┤
│ • Raw & Object Data    │ • Geometry Scaling      │ • Scalable SVG (Shadow DOM)    │
│ • Domain Locking       │ • Curve Interpolation   │ • Reactive Hover / Crosshairs  │
│ • Curve Types          │ • Dynamic Palette & CSS │ • Custom Events (Hover/Select) │
│ • Reference Lines      │ • Animation Controller  │ • WCAG 2.2 / Screen Readers    │
└────────────────────────┴─────────────────────────┴────────────────────────────────┘
```

---

## 📑 Mappa Parametri per Famiglia di Componenti

### 1. Trend Cartesiani (`mini-line-chart`, `mini-area-chart`)
- **Inputs**: `data`, `curve` (`"linear" | "smooth" | "step"`), `min`, `max`, `points` (`"last" | "min-max" | "none" | "all"`), `reference-value`, `trend-color` (`"auto"`).
- **Outputs**: Evento `sparkline-hover` (`{ index, value, x, y }`), `sparkline-leave`, crosshair interattivo.
- **CSS**: `--mini-chart-color`, `--mini-chart-stroke-width`, `--mini-chart-gradient-from/to/opacity`, `part="line"`, `part="area"`, `part="point"`, `part="crosshair"`.
- **Motion**: `mask-wipe`, `draw`, `morph`, `pulse`.

### 2. Barre & Signed Comparisons (`mini-bar-chart`)
- **Inputs**: `data`, `gap` (spaziatura barre), `radius` (angoli arrotondati `rx`), `baseline` (`"zero" | "min"`), `min`, `max`.
- **Outputs**: Evento `sparkline-hover` (`{ index, value, isPositive }`), bar dimming degli altri elementi.
- **CSS**: `--mini-chart-positive-color`, `--mini-chart-negative-color`, `part="bar positive"`, `part="bar negative"`.
- **Motion**: Staggered vertical growth dal baseline.

### 3. Fette & Proporzioni (`mini-pie-chart`, `mini-half-pie-chart`)
- **Inputs**: `data`, `inner-radius` / `donut` (per trasformazione in Donut chart), `pad-angle`, `start-angle`.
- **Outputs**: Evento `sparkline-hover` (`{ index, value, percentage, color }`), slice pop-out.
- **CSS**: `--mini-chart-gap-color`, `--mini-chart-gap-width`, `part="segment"`, `part="segment-active"`.
- **Motion**: Svelamento radiale ad orologio 360°/180°.

### 4. Anelli Concentrici (`mini-radial-bar-chart`)
- **Inputs**: `data` (numeri o oggetti con colore), `min`, `max`, `sweep-angle`, `round-caps`.
- **Outputs**: Evento `sparkline-hover` (`{ trackIndex, value, percentage }`).
- **CSS**: `--mini-chart-track-bg`, `--mini-chart-ring-width`, `part="track"`, `part="track-bg"`.
- **Motion**: Trace concentrico progressivo.

### 5. Metriche & Strumenti di Misura (`mini-progress-chart`, `mini-gauge-chart`)
- **Inputs**: `data`, `min`, `max`, `zones` (JSON threshold array), `show-value`.
- **Outputs**: `role="meter"`, evento `zone-change` (`{ value, zone, color }`).
- **CSS**: `--mini-chart-needle-color`, `--mini-chart-track-color`, `part="needle"`, `part="pivot"`, `part="zones"`.
- **Motion**: Rotazione elastica con rimbalzo (`cubic-bezier(0.34, 1.56, 0.64, 1)`).

### 6. Finanziari OHLC (`mini-candlestick-chart`, `mini-ohlc-chart`)
- **Inputs**: `data` (`[[o,h,l,c], ...]`), `hollow-bullish`, `wick-width`.
- **Outputs**: Evento `sparkline-hover` (`{ open, high, low, close, change, changePercent, isBullish }`).
- **CSS**: `--mini-chart-bullish-color`, `--mini-chart-bearish-color`, `part="candle"`, `part="wick"`, `part="body"`.
- **Motion**: Apertura dal prezzo open con animazione fluida.

### 7. Multistrato & Composti (`mini-stacked-area-chart`, `mini-stream-chart`, `mini-combo-chart`)
- **Inputs**: `data` (2D arrays o `{bar, line}[]`), `shared-domain` (combo), `curve` (stream).
- **Outputs**: Evidenziazione layer al passaggio del mouse (`highlight-layer`).
- **CSS**: Palette dinamica per layer, `part="layer"`, `part="bar"`, `part="line"`.
- **Motion**: Wipe orizzontale sincronizzato.
