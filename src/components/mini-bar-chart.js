// mini-bar-chart.js — Responsive SVG bar sparkline Custom Element.

import { createBarLayout } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Renders a numeric series as a compact bar sparkline with animations.
 *
 * @extends MiniChartElement
 */
export class MiniBarChart extends MiniChartElement {
  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Bar";
  }

  /** Renders the element's complete Shadow DOM tree, preserving SVG for animations. */
  render() {
    const data = this.data;
    const label = this.getAttribute("label") ?? this.createDefaultLabel(data);
    let style = this.shadowRoot?.querySelector("style");
    let svg = this.shadowRoot?.querySelector("svg");
    const isInitialRender = !svg;

    if (!svg || !style) {
      style = document.createElement("style");
      svg = createChartSvg({ width: this.chartWidth, height: this.chartHeight, label });
      this.shadowRoot?.replaceChildren(style, svg);
    } else {
      svg.setAttribute("aria-label", label);
      const title = svg.querySelector("title");
      if (title) title.textContent = label;
    }

    style.textContent = `${chartStyles}\n:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }\n[part="bar"] { transition: all 0.4s ease-out; transform-box: fill-box; }`;

    this.renderChart(svg, data, isInitialRender);
  }

  /**
   * Updates SVG children with DOM diffing and applies animations.
   * 
   * @param {SVGSVGElement} svg Responsive SVG root.
   * @param {number[]} data Parsed chart values.
   * @param {boolean} isInitial True if this is the first render.
   */
  renderChart(svg, data, isInitial = false) {
    const { bars, baseline } = createBarLayout(data);
    const existingBars = /** @type {SVGRectElement[]} */ (Array.from(svg.querySelectorAll('[part="bar"]')));

    // Match the number of rects to data
    while (existingBars.length < bars.length) {
      const rect = /** @type {SVGRectElement} */ (createSvgElement("rect", { part: "bar" }));
      svg.append(rect);
      existingBars.push(rect);
    }
    while (existingBars.length > bars.length) {
      const rect = existingBars.pop();
      rect?.remove();
    }

    // Apply layout with animations
    bars.forEach((bar, index) => {
      const rect = existingBars[index];
      
      if (isInitial) {
        // Entrance: start at baseline with height 0
        rect.style.transition = "none";
        rect.setAttribute("x", String(bar.x));
        rect.setAttribute("y", String(baseline));
        rect.setAttribute("width", String(bar.width));
        rect.setAttribute("height", "0");
        
        // Force layout calculation to ensure the initial state is applied
        rect.getBoundingClientRect();
        
        // Restore transition with a staggered delay
        rect.style.transition = `all 0.4s ease-out ${index * 0.05}s`;
        rect.setAttribute("y", String(bar.y));
        rect.setAttribute("height", String(bar.height));
        
        // Clean up inline styles once entrance is complete so future updates use standard timing
        setTimeout(() => {
          if (rect.isConnected) rect.style.transition = "";
        }, 400 + index * 50);
      } else {
        // Update: CSS transitions handle the smooth layout shift
        rect.style.transition = "";
        rect.setAttribute("x", String(bar.x));
        rect.setAttribute("y", String(bar.y));
        rect.setAttribute("width", String(bar.width));
        rect.setAttribute("height", String(bar.height));
      }
    });
  }
}
