// mini-chart.directive.ts — Angular directives for Sparkline Mini Charts: 17 signal-based per-chart directives and the decorator-based catch-all.

// The package is built by Vite, not by the Angular compiler, so it ships no
// Angular metadata (ɵdir, ɵfac). The signal-based per-chart directives below
// therefore do not work from node_modules, under AOT or JIT, until the
// dedicated @sparkline-mini-charts/angular package (planned for 1.5).
// MiniChartDirective (decorators) works under JIT only; the AOT-safe path is
// the raw custom elements with CUSTOM_ELEMENTS_SCHEMA, as README.md describes.

import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  booleanAttribute,
  effect,
  inject,
  input,
  numberAttribute,
  output,
  type OutputEmitterRef,
} from "@angular/core";
import { MiniAreaChart } from "../components/mini-area-chart.js";
import { MiniBarChart } from "../components/mini-bar-chart.js";
import { MiniBulletChart } from "../components/mini-bullet-chart.js";
import { MiniCandlestickChart } from "../components/mini-candlestick-chart.js";
import { MiniComboChart } from "../components/mini-combo-chart.js";
import { MiniGaugeChart } from "../components/mini-gauge-chart.js";
import { MiniHalfPieChart } from "../components/mini-half-pie-chart.js";
import { MiniLineChart } from "../components/mini-line-chart.js";
import { MiniOhlcChart } from "../components/mini-ohlc-chart.js";
import { MiniPieChart } from "../components/mini-pie-chart.js";
import { MiniProgressChart } from "../components/mini-progress-chart.js";
import { MiniRadialBarChart } from "../components/mini-radial-bar-chart.js";
import { MiniRangeBarChart } from "../components/mini-range-bar-chart.js";
import { MiniScatterChart } from "../components/mini-scatter-chart.js";
import { MiniStackedAreaChart } from "../components/mini-stacked-area-chart.js";
import { MiniStreamChart } from "../components/mini-stream-chart.js";
import { MiniWinLossChart } from "../components/mini-win-loss-chart.js";
import { defineMiniChart } from "../core/registration.js";
import { defineMiniCharts } from "../define.js";

/** Synchronizes an HTML attribute with an Angular signal value. */
function syncAttr(el: HTMLElement, name: string, value: any) {
  if (value !== undefined && value !== null && value !== false) {
    el.setAttribute(name, String(value));
  } else {
    el.removeAttribute(name);
  }
}

/**
 * Synchronizes a boolean attribute that the chart treats as on when it is
 * absent (`hollow-bullish`, `round-caps`, `shared-domain`). Turning one off
 * takes the explicit value `"false"`, as the React and Vue wrappers write it;
 * removing the attribute would leave the option on.
 */
function syncDefaultTrueAttr(el: HTMLElement, name: string, value: boolean) {
  el.setAttribute(name, value ? "" : "false");
}

/** Synchronizes an attribute containing JSON or raw primitive value. */
function syncJsonAttr(el: HTMLElement, name: string, value: any) {
  if (value === undefined || value === null) {
    el.removeAttribute(name);
  } else if (typeof value === "string") {
    el.setAttribute(name, value);
  } else {
    el.setAttribute(name, JSON.stringify(value));
  }
}

/** Binds custom DOM events emitted by native charts to Angular signal outputs. */
function bindChartEvents(
  el: HTMLElement,
  sparklineHover?: OutputEmitterRef<CustomEvent>,
  sparklineLeave?: OutputEmitterRef<CustomEvent>,
  sliceSelect?: OutputEmitterRef<CustomEvent>,
  zoneChange?: OutputEmitterRef<CustomEvent>,
) {
  if (sparklineHover) {
    el.addEventListener("sparkline-hover", (e: Event) => sparklineHover.emit(e as CustomEvent));
  }
  if (sparklineLeave) {
    el.addEventListener("sparkline-leave", (e: Event) => sparklineLeave.emit(e as CustomEvent));
  }
  if (sliceSelect) {
    el.addEventListener("slice-select", (e: Event) => sliceSelect.emit(e as CustomEvent));
  }
  if (zoneChange) {
    el.addEventListener("zone-change", (e: Event) => zoneChange.emit(e as CustomEvent));
  }
}

// ---------------------------------------------------------------------------
// 1. Line Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-line-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-line-chart",
  standalone: true,
})
export class MiniLineChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly curve = input<string | undefined>();
  readonly points = input<string | undefined>();
  readonly min = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly max = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly referenceValue = input<number | undefined, number | string | undefined>(undefined, { alias: "reference-value", transform: numberAttribute });
  readonly trendColor = input<string | undefined>(undefined, { alias: "trend-color" });
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-line-chart", MiniLineChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "curve", this.curve()));
    effect(() => syncAttr(el, "points", this.points()));
    effect(() => syncAttr(el, "min", this.min()));
    effect(() => syncAttr(el, "max", this.max()));
    effect(() => syncAttr(el, "reference-value", this.referenceValue()));
    effect(() => syncAttr(el, "trend-color", this.trendColor()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave);
  }
}

// ---------------------------------------------------------------------------
// 2. Bar Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-bar-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-bar-chart",
  standalone: true,
})
export class MiniBarChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly gap = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly radius = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly baseline = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly min = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly max = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-bar-chart", MiniBarChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "gap", this.gap()));
    effect(() => syncAttr(el, "radius", this.radius()));
    effect(() => syncAttr(el, "baseline", this.baseline()));
    effect(() => syncAttr(el, "min", this.min()));
    effect(() => syncAttr(el, "max", this.max()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave);
  }
}

// ---------------------------------------------------------------------------
// 3. Area Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-area-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-area-chart",
  standalone: true,
})
export class MiniAreaChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly curve = input<string | undefined>();
  readonly points = input<string | undefined>();
  readonly gradient = input<any>();
  readonly min = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly max = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly referenceValue = input<number | undefined, number | string | undefined>(undefined, { alias: "reference-value", transform: numberAttribute });
  readonly trendColor = input<string | undefined>(undefined, { alias: "trend-color" });
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-area-chart", MiniAreaChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "curve", this.curve()));
    effect(() => syncAttr(el, "points", this.points()));
    effect(() => syncJsonAttr(el, "gradient", this.gradient()));
    effect(() => syncAttr(el, "min", this.min()));
    effect(() => syncAttr(el, "max", this.max()));
    effect(() => syncAttr(el, "reference-value", this.referenceValue()));
    effect(() => syncAttr(el, "trend-color", this.trendColor()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave);
  }
}

// ---------------------------------------------------------------------------
// 4. Stacked Area Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-stacked-area-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-stacked-area-chart",
  standalone: true,
})
export class MiniStackedAreaChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly curve = input<string | undefined>();
  readonly normalize = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-stacked-area-chart", MiniStackedAreaChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "curve", this.curve()));
    effect(() => syncAttr(el, "normalize", this.normalize() ? "" : undefined));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave);
  }
}

// ---------------------------------------------------------------------------
// 5. Stream Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-stream-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-stream-chart",
  standalone: true,
})
export class MiniStreamChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly curve = input<string | undefined>();
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-stream-chart", MiniStreamChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "curve", this.curve()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave);
  }
}

// ---------------------------------------------------------------------------
// 6. Pie Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-pie-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-pie-chart",
  standalone: true,
})
export class MiniPieChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly innerRadius = input<number | undefined, number | string | undefined>(undefined, { alias: "inner-radius", transform: numberAttribute });
  readonly donut = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly padAngle = input<number | undefined, number | string | undefined>(undefined, { alias: "pad-angle", transform: numberAttribute });
  readonly startAngle = input<number | undefined, number | string | undefined>(undefined, { alias: "start-angle", transform: numberAttribute });
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();
  readonly sliceSelect = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-pie-chart", MiniPieChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "inner-radius", this.innerRadius()));
    effect(() => syncAttr(el, "donut", this.donut()));
    effect(() => syncAttr(el, "pad-angle", this.padAngle()));
    effect(() => syncAttr(el, "start-angle", this.startAngle()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave, this.sliceSelect);
  }
}

// ---------------------------------------------------------------------------
// 7. Half-Pie Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-half-pie-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-half-pie-chart",
  standalone: true,
})
export class MiniHalfPieChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly innerRadius = input<number | undefined, number | string | undefined>(undefined, { alias: "inner-radius", transform: numberAttribute });
  readonly donut = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();
  readonly sliceSelect = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-half-pie-chart", MiniHalfPieChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "inner-radius", this.innerRadius()));
    effect(() => syncAttr(el, "donut", this.donut()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave, this.sliceSelect);
  }
}

// ---------------------------------------------------------------------------
// 8. Radial Bar Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-radial-bar-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-radial-bar-chart",
  standalone: true,
})
export class MiniRadialBarChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly sweep = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  // On by default, like the chart: `false` writes `round-caps="false"`.
  readonly roundCaps = input<boolean, boolean | string | undefined>(true, { alias: "round-caps", transform: booleanAttribute });
  readonly min = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly max = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly gradient = input<any>();
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-radial-bar-chart", MiniRadialBarChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "sweep", this.sweep()));
    effect(() => syncDefaultTrueAttr(el, "round-caps", this.roundCaps()));
    effect(() => syncAttr(el, "min", this.min()));
    effect(() => syncAttr(el, "max", this.max()));
    effect(() => syncJsonAttr(el, "gradient", this.gradient()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave);
  }
}

// ---------------------------------------------------------------------------
// 9. Progress Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-progress-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-progress-chart",
  standalone: true,
})
export class MiniProgressChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly min = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly max = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly showValue = input<boolean, boolean | string | undefined>(false, { alias: "show-value", transform: booleanAttribute });
  readonly unit = input<string | undefined>();
  readonly gradient = input<any>();
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-progress-chart", MiniProgressChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "min", this.min()));
    effect(() => syncAttr(el, "max", this.max()));
    effect(() => syncAttr(el, "show-value", this.showValue() ? "" : undefined));
    effect(() => syncAttr(el, "unit", this.unit()));
    effect(() => syncJsonAttr(el, "gradient", this.gradient()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave);
  }
}

// ---------------------------------------------------------------------------
// 10. Gauge Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-gauge-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-gauge-chart",
  standalone: true,
})
export class MiniGaugeChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly min = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly max = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly zones = input<any>();
  readonly needleType = input<string | undefined>(undefined, { alias: "needle-type" });
  readonly showValue = input<boolean, boolean | string | undefined>(false, { alias: "show-value", transform: booleanAttribute });
  readonly gradient = input<any>();
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();
  readonly zoneChange = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-gauge-chart", MiniGaugeChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "min", this.min()));
    effect(() => syncAttr(el, "max", this.max()));
    effect(() => syncJsonAttr(el, "zones", this.zones()));
    effect(() => syncAttr(el, "needle-type", this.needleType()));
    effect(() => syncAttr(el, "show-value", this.showValue() ? "" : undefined));
    effect(() => syncJsonAttr(el, "gradient", this.gradient()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave, undefined, this.zoneChange);
  }
}

// ---------------------------------------------------------------------------
// 11. Candlestick Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-candlestick-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-candlestick-chart",
  standalone: true,
})
export class MiniCandlestickChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  // On by default, like the chart: `false` writes `hollow-bullish="false"`.
  readonly hollowBullish = input<boolean, boolean | string | undefined>(true, { alias: "hollow-bullish", transform: booleanAttribute });
  readonly wickWidth = input<number | undefined, number | string | undefined>(undefined, { alias: "wick-width", transform: numberAttribute });
  readonly gap = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly min = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly max = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-candlestick-chart", MiniCandlestickChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncDefaultTrueAttr(el, "hollow-bullish", this.hollowBullish()));
    effect(() => syncAttr(el, "wick-width", this.wickWidth()));
    effect(() => syncAttr(el, "gap", this.gap()));
    effect(() => syncAttr(el, "min", this.min()));
    effect(() => syncAttr(el, "max", this.max()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave);
  }
}

// ---------------------------------------------------------------------------
// 12. OHLC Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-ohlc-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-ohlc-chart",
  standalone: true,
})
export class MiniOhlcChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly tickWidth = input<number | undefined, number | string | undefined>(undefined, { alias: "tick-width", transform: numberAttribute });
  readonly gap = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly min = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly max = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-ohlc-chart", MiniOhlcChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "tick-width", this.tickWidth()));
    effect(() => syncAttr(el, "gap", this.gap()));
    effect(() => syncAttr(el, "min", this.min()));
    effect(() => syncAttr(el, "max", this.max()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave);
  }
}

// ---------------------------------------------------------------------------
// 13. Combo Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-combo-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-combo-chart",
  standalone: true,
})
export class MiniComboChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  // On by default, like the chart: `false` writes `shared-domain="false"`.
  readonly sharedDomain = input<boolean, boolean | string | undefined>(true, { alias: "shared-domain", transform: booleanAttribute });
  readonly curve = input<string | undefined>();
  readonly barGap = input<number | undefined, number | string | undefined>(undefined, { alias: "bar-gap", transform: numberAttribute });
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-combo-chart", MiniComboChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncDefaultTrueAttr(el, "shared-domain", this.sharedDomain()));
    effect(() => syncAttr(el, "curve", this.curve()));
    effect(() => syncAttr(el, "bar-gap", this.barGap()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave);
  }
}

// ---------------------------------------------------------------------------
// 14. Bullet Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-bullet-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-bullet-chart",
  standalone: true,
})
export class MiniBulletChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly target = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly min = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly max = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly ranges = input<any>();
  readonly gradient = input<any>();
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-bullet-chart", MiniBulletChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "target", this.target()));
    effect(() => syncAttr(el, "min", this.min()));
    effect(() => syncAttr(el, "max", this.max()));
    effect(() => syncJsonAttr(el, "ranges", this.ranges()));
    effect(() => syncJsonAttr(el, "gradient", this.gradient()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave);
  }
}

// ---------------------------------------------------------------------------
// 15. Win/Loss Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-win-loss-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-win-loss-chart",
  standalone: true,
})
export class MiniWinLossChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly gap = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly radius = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly mode = input<string | undefined>();
  readonly winColor = input<string | undefined>(undefined, { alias: "win-color" });
  readonly lossColor = input<string | undefined>(undefined, { alias: "loss-color" });
  readonly tieColor = input<string | undefined>(undefined, { alias: "tie-color" });
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-win-loss-chart", MiniWinLossChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "gap", this.gap()));
    effect(() => syncAttr(el, "radius", this.radius()));
    effect(() => syncAttr(el, "mode", this.mode()));
    effect(() => syncAttr(el, "win-color", this.winColor()));
    effect(() => syncAttr(el, "loss-color", this.lossColor()));
    effect(() => syncAttr(el, "tie-color", this.tieColor()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave);
  }
}

// ---------------------------------------------------------------------------
// 16. Range Bar Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-range-bar-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-range-bar-chart",
  standalone: true,
})
export class MiniRangeBarChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly gap = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly radius = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly min = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly max = input<number | undefined, number | string | undefined>(undefined, { transform: numberAttribute });
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-range-bar-chart", MiniRangeBarChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "gap", this.gap()));
    effect(() => syncAttr(el, "radius", this.radius()));
    effect(() => syncAttr(el, "min", this.min()));
    effect(() => syncAttr(el, "max", this.max()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave);
  }
}

// ---------------------------------------------------------------------------
// 17. Scatter Chart Directive
// ---------------------------------------------------------------------------
/**
 * Signal-based directive for `<mini-scatter-chart>`.
 *
 * Needs the Angular compiler to process this package, which does not happen
 * from node_modules: see {@link SPARKLINE_DIRECTIVES}.
 */
@Directive({
  selector: "mini-scatter-chart",
  standalone: true,
})
export class MiniScatterChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  readonly data = input<any>();
  readonly label = input<string | undefined>();
  readonly pointRadius = input<number | undefined, number | string | undefined>(undefined, { alias: "point-radius", transform: numberAttribute });
  readonly trendLine = input<boolean, boolean | string | undefined>(false, { alias: "trend-line", transform: booleanAttribute });
  readonly minX = input<number | undefined, number | string | undefined>(undefined, { alias: "min-x", transform: numberAttribute });
  readonly maxX = input<number | undefined, number | string | undefined>(undefined, { alias: "max-x", transform: numberAttribute });
  readonly minY = input<number | undefined, number | string | undefined>(undefined, { alias: "min-y", transform: numberAttribute });
  readonly maxY = input<number | undefined, number | string | undefined>(undefined, { alias: "max-y", transform: numberAttribute });
  readonly interactive = input<boolean, boolean | string | undefined>(false, { transform: booleanAttribute });

  readonly sparklineHover = output<CustomEvent>();
  readonly sparklineLeave = output<CustomEvent>();

  constructor() {
    defineMiniChart("mini-scatter-chart", MiniScatterChart);
    const el = this.#element.nativeElement;

    effect(() => {
      const d = this.data();
      if (d !== undefined) el.data = d;
    });

    effect(() => syncAttr(el, "label", this.label()));
    effect(() => syncAttr(el, "point-radius", this.pointRadius()));
    effect(() => syncAttr(el, "trend-line", this.trendLine() ? "" : undefined));
    effect(() => syncAttr(el, "min-x", this.minX()));
    effect(() => syncAttr(el, "max-x", this.maxX()));
    effect(() => syncAttr(el, "min-y", this.minY()));
    effect(() => syncAttr(el, "max-y", this.maxY()));
    effect(() => syncAttr(el, "interactive", this.interactive() ? "" : undefined));

    bindChartEvents(el, this.sparklineHover, this.sparklineLeave);
  }
}

// ---------------------------------------------------------------------------
// Unified Array & Catch-All Compatibility Directive
// ---------------------------------------------------------------------------

/**
 * All 17 signal-based per-chart directives, for Angular `imports`.
 *
 * Known limitation in 1.4.x: these directives use `input()`, `output()` and
 * `effect()`, which only work when the Angular compiler processes the code.
 * This package is not compiled by it, so imported from node_modules they do
 * not work in AOT builds (the compiler rejects them with NG2012: no compiled
 * directive metadata) nor in JIT (the runtime compiler sees no inputs or
 * outputs on them, so only `[data]` reaches the element). They stay exported
 * so 1.4.0 code keeps compiling, and will work from the dedicated
 * `@sparkline-mini-charts/angular` package, planned for 1.5.
 *
 * Until then, in AOT builds use the raw elements:
 * `import "sparkline-mini-charts/register"`, `schemas: [CUSTOM_ELEMENTS_SCHEMA]`
 * and `[data]="values"` on the tags. In JIT builds, {@link MiniChartDirective}
 * also works. Do not combine this array with MiniChartDirective.
 */
export const SPARKLINE_DIRECTIVES = [
  MiniLineChartDirective,
  MiniBarChartDirective,
  MiniAreaChartDirective,
  MiniStackedAreaChartDirective,
  MiniStreamChartDirective,
  MiniPieChartDirective,
  MiniHalfPieChartDirective,
  MiniRadialBarChartDirective,
  MiniProgressChartDirective,
  MiniGaugeChartDirective,
  MiniCandlestickChartDirective,
  MiniOhlcChartDirective,
  MiniComboChartDirective,
  MiniBulletChartDirective,
  MiniWinLossChartDirective,
  MiniRangeBarChartDirective,
  MiniScatterChartDirective,
] as const;

/**
 * Catch-all directive for the 17 chart tags, written with decorators.
 *
 * This is the 1.3.0 directive with the 1.4.0 inputs and outputs. It is the
 * only directive in this file that works when the package comes from
 * node_modules in a JIT-compiled app: Angular reads its `@Input()` and
 * `@Output()` metadata at runtime, so no Angular compiler pass over the
 * package is needed. Creating it registers every chart tag, so no separate
 * `sparkline-mini-charts/register` import is needed either.
 *
 * Other chart attributes (`zones`, `ranges`, `gap`…) are not inputs here:
 * bind them with `[attr.zones]="zonesJson"`. Do not import this directive
 * together with {@link SPARKLINE_DIRECTIVES}: two directives would then match
 * one element and every output would fire twice.
 *
 * It does not work in AOT builds (the Angular CLI default): the AOT compiler
 * rejects it with NG2012 because the package ships no compiled Angular
 * metadata. There, use the raw elements instead (see README.md):
 * `import "sparkline-mini-charts/register"`, `schemas: [CUSTOM_ELEMENTS_SCHEMA]`
 * and `[data]="values"` on the tags.
 */
@Directive({
  selector: "mini-line-chart, mini-bar-chart, mini-area-chart, mini-stacked-area-chart, mini-stream-chart, mini-pie-chart, mini-half-pie-chart, mini-radial-bar-chart, mini-progress-chart, mini-gauge-chart, mini-candlestick-chart, mini-ohlc-chart, mini-combo-chart, mini-bullet-chart, mini-win-loss-chart, mini-range-bar-chart, mini-scatter-chart",
  standalone: true,
})
export class MiniChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  /** Emits the `sparkline-hover` event of the chart. */
  @Output() readonly sparklineHover = new EventEmitter<CustomEvent>();
  /** Emits the `sparkline-leave` event of the chart. */
  @Output() readonly sparklineLeave = new EventEmitter<CustomEvent>();
  /** Emits the `sparkline-select` event (candlestick chart). */
  @Output() readonly sparklineSelect = new EventEmitter<CustomEvent>();
  /** Kept for compatibility with 1.4.0: no chart dispatches `slice-select`, so this never emits. */
  @Output() readonly sliceSelect = new EventEmitter<CustomEvent>();
  /** Emits the `zone-change` event (gauge chart). */
  @Output() readonly zoneChange = new EventEmitter<CustomEvent>();
  /** Emits the `progress-complete` event (progress chart). */
  @Output() readonly progressComplete = new EventEmitter<CustomEvent>();

  constructor() {
    const el = this.#element.nativeElement;

    // Register every tag, then upgrade this element now if Angular created it
    // before the definitions existed, so inputs go through the chart accessors.
    defineMiniCharts();
    globalThis.customElements?.upgrade(el);

    const outputs: [string, EventEmitter<CustomEvent>][] = [
      ["sparkline-hover", this.sparklineHover],
      ["sparkline-leave", this.sparklineLeave],
      ["sparkline-select", this.sparklineSelect],
      ["slice-select", this.sliceSelect],
      ["zone-change", this.zoneChange],
      ["progress-complete", this.progressComplete],
    ];
    for (const [type, emitter] of outputs) {
      el.addEventListener(type, (e: Event) => emitter.emit(e as CustomEvent));
    }
  }

  /** @param {any} values Chart values; arrays and objects are stored as JSON, strings unchanged. */
  @Input()
  set data(values: any) {
    this.#element.nativeElement.data = values;
  }

  /** @param {string | undefined} value Accessible chart label. */
  @Input()
  set label(value: string | undefined) {
    syncAttr(this.#element.nativeElement, "label", value);
  }

  /** @param {string | undefined} value Curve type of line-based charts. */
  @Input()
  set curve(value: string | undefined) {
    syncAttr(this.#element.nativeElement, "curve", value);
  }

  /** @param {string | undefined} value Point markers of the line and area charts. */
  @Input()
  set points(value: string | undefined) {
    syncAttr(this.#element.nativeElement, "points", value);
  }

  /** @param {number | string | undefined} value Lower bound of the value domain. */
  @Input()
  set min(value: number | string | undefined) {
    syncAttr(this.#element.nativeElement, "min", value);
  }

  /** @param {number | string | undefined} value Upper bound of the value domain. */
  @Input()
  set max(value: number | string | undefined) {
    syncAttr(this.#element.nativeElement, "max", value);
  }

  /** @param {any} value Gradient colors, as an array or as the attribute string. */
  @Input()
  set gradient(value: any) {
    syncJsonAttr(this.#element.nativeElement, "gradient", value);
  }

  /** @param {boolean | string | undefined} value Enables pointer interaction; `""` (the bare attribute) counts as true. */
  @Input()
  set interactive(value: boolean | string | undefined) {
    syncAttr(this.#element.nativeElement, "interactive", booleanAttribute(value) ? "" : undefined);
  }
}
