// mini-chart.directive.ts — Angular standalone directive that binds data to every native sparkline tag.

import { Directive, ElementRef, Input, inject } from "@angular/core";
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

const chartComponents = Object.freeze({
  "mini-line-chart": MiniLineChart,
  "mini-bar-chart": MiniBarChart,
  "mini-area-chart": MiniAreaChart,
  "mini-stacked-area-chart": MiniStackedAreaChart,
  "mini-stream-chart": MiniStreamChart,
  "mini-pie-chart": MiniPieChart,
  "mini-half-pie-chart": MiniHalfPieChart,
  "mini-radial-bar-chart": MiniRadialBarChart,
  "mini-progress-chart": MiniProgressChart,
  "mini-gauge-chart": MiniGaugeChart,
  "mini-candlestick-chart": MiniCandlestickChart,
  "mini-ohlc-chart": MiniOhlcChart,
  "mini-combo-chart": MiniComboChart,
  "mini-bullet-chart": MiniBulletChart,
  "mini-win-loss-chart": MiniWinLossChart,
  "mini-range-bar-chart": MiniRangeBarChart,
  "mini-scatter-chart": MiniScatterChart,
});

/**
 * Makes every native chart tag accept Angular `[data]` and `[label]` bindings.
 */
@Directive({
  selector: "mini-line-chart, mini-bar-chart, mini-area-chart, mini-stacked-area-chart, mini-stream-chart, mini-pie-chart, mini-half-pie-chart, mini-radial-bar-chart, mini-progress-chart, mini-gauge-chart, mini-candlestick-chart, mini-ohlc-chart, mini-combo-chart, mini-bullet-chart, mini-win-loss-chart, mini-range-bar-chart, mini-scatter-chart",
  standalone: true,
})
export class MiniChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: any }>>(ElementRef);

  constructor() {
    const tagName = this.#element.nativeElement.localName;
    const component = chartComponents[tagName as keyof typeof chartComponents];
    if (component) defineMiniChart(tagName, component);
  }

  /** @param {any} values Values for the current chart. */
  @Input()
  set data(values: any) {
    this.#element.nativeElement.data = values;
  }

  /** @param {string | undefined} value Accessible chart label. */
  @Input()
  set label(value: string | undefined) {
    if (value) {
      this.#element.nativeElement.setAttribute("label", value);
      return;
    }

    this.#element.nativeElement.removeAttribute("label");
  }
}
