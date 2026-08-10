// mini-chart.directive.ts — Angular standalone directive that binds data to every native sparkline tag.

import { Directive, ElementRef, Input, inject } from "@angular/core";
import { MiniBarChart } from "../components/mini-bar-chart.js";
import { MiniHalfPieChart } from "../components/mini-half-pie-chart.js";
import { MiniLineChart } from "../components/mini-line-chart.js";
import { MiniPieChart } from "../components/mini-pie-chart.js";
import { defineMiniChart } from "../core/registration.js";

const chartComponents = Object.freeze({
  "mini-line-chart": MiniLineChart,
  "mini-bar-chart": MiniBarChart,
  "mini-pie-chart": MiniPieChart,
  "mini-half-pie-chart": MiniHalfPieChart,
});

/**
 * Makes the native chart tags accept Angular `[data]` and `[label]` bindings.
 */
@Directive({
  selector: "mini-line-chart, mini-bar-chart, mini-pie-chart, mini-half-pie-chart",
  standalone: true,
})
export class MiniChartDirective {
  readonly #element = inject<ElementRef<HTMLElement & { data: number[] }>>(ElementRef);

  constructor() {
    const tagName = this.#element.nativeElement.localName;
    const component = chartComponents[tagName as keyof typeof chartComponents];
    if (component) defineMiniChart(tagName, component);
  }

  /** @param {readonly number[] | undefined} values Values for the current chart. */
  @Input()
  set data(values: readonly number[] | undefined) {
    this.#element.nativeElement.data = values ? [...values] : [];
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
