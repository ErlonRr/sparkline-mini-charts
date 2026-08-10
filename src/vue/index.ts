// index.ts — Vue 3 wrappers for the native Sparkline Mini Charts elements.

import { defineComponent, h, type PropType } from "vue";
import { MiniBarChart as MiniBarChartElement } from "../components/mini-bar-chart.js";
import { MiniHalfPieChart as MiniHalfPieChartElement } from "../components/mini-half-pie-chart.js";
import { MiniLineChart as MiniLineChartElement } from "../components/mini-line-chart.js";
import { MiniPieChart as MiniPieChartElement } from "../components/mini-pie-chart.js";
import { defineMiniChart } from "../core/registration.js";

function createVueChart(componentName: string, tagName: string, component: CustomElementConstructor) {
  return defineComponent({
    name: componentName,
    inheritAttrs: false,
    props: {
      data: {
        type: Array as PropType<readonly number[]>,
        default: () => [],
      },
      label: {
        type: String,
        default: undefined,
      },
    },
    setup(props, { attrs }) {
      defineMiniChart(tagName, component);

      return () =>
        h(tagName, {
          ...attrs,
          data: JSON.stringify(props.data),
          label: props.label,
        });
    },
  });
}

/** Vue wrapper for `<mini-line-chart>`. */
export const MiniLineChart = createVueChart("MiniLineChart", "mini-line-chart", MiniLineChartElement);

/** Vue wrapper for `<mini-bar-chart>`. */
export const MiniBarChart = createVueChart("MiniBarChart", "mini-bar-chart", MiniBarChartElement);

/** Vue wrapper for `<mini-pie-chart>`. */
export const MiniPieChart = createVueChart("MiniPieChart", "mini-pie-chart", MiniPieChartElement);

/** Vue wrapper for `<mini-half-pie-chart>`. */
export const MiniHalfPieChart = createVueChart("MiniHalfPieChart", "mini-half-pie-chart", MiniHalfPieChartElement);
