// mini-pie-chart.js — Responsive SVG pie sparkline Custom Element.

import { createRadialLayout, describePieSector } from "../core/geometry.js";
import { MiniChartElement } from "../core/mini-chart-element.js";
import { getSegmentColor } from "../core/palette.js";
import { createSvgElement, createChartSvg, chartStyles } from "../core/svg.js";

/**
 * Renders non-negative values as a full circular pie sparkline with animations.
 *
 * @extends MiniChartElement
 */
export class MiniPieChart extends MiniChartElement {
  /** @returns {number} SVG viewBox height. */
  get chartHeight() {
    return 100;
  }

  /** @returns {string} Human-readable chart type. */
  get chartName() {
    return "Pie";
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
      
      const maskId = `pie-mask-${Math.random().toString(36).slice(2)}`;
      svg.dataset.maskId = maskId;
      
      const defs = createSvgElement("defs");
      const mask = createSvgElement("mask", { id: maskId });
      const maskCircle = createSvgElement("circle", { 
        cx: "50", cy: "50", r: "25", 
        fill: "none", stroke: "white", "stroke-width": "50",
        "stroke-dasharray": "157.1", "stroke-dashoffset": "157.1",
        transform: "rotate(-90 50 50)"
      });
      
      mask.append(maskCircle);
      defs.append(mask);
      
      const group = createSvgElement("g", { mask: `url(#${maskId})`, part: "group" });
      svg.append(defs, group);
      
      this.shadowRoot?.replaceChildren(style, svg);
    } else {
      svg.setAttribute("aria-label", label);
      const title = svg.querySelector("title");
      if (title) title.textContent = label;
    }

    style.textContent = `${chartStyles}
:host { --mini-chart-default-aspect-ratio: ${this.chartAspectRatio}; }
[part="segment"] { transition: d 0.4s ease-out; }
mask circle { transition: stroke-dashoffset 0.8s ease-out; }`;

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
    const { slices } = createRadialLayout(data);
    const group = svg.querySelector('[part="group"]');
    if (!group) return;

    const existingSegments = Array.from(group.querySelectorAll('[part="segment"]'));

    // DOM Diffing
    while (existingSegments.length < slices.length) {
      const segment = createSvgElement("path", { part: "segment" });
      group.append(segment);
      existingSegments.push(segment);
    }
    while (existingSegments.length > slices.length) {
      const segment = existingSegments.pop();
      segment?.remove();
    }

    // Apply layout and properties
    slices.forEach((slice, index) => {
      const path = describePieSector(50, 50, 48, slice.startAngle, slice.endAngle);
      const segment = /** @type {SVGPathElement} */ (existingSegments[index]);
      
      if (!path) {
        segment.setAttribute("d", "");
        return;
      }

      if (isInitial) {
        segment.style.transition = "none";
      } else {
        segment.style.transition = "";
      }
      
      segment.setAttribute("d", path);
      segment.setAttribute("data-index", String(index));
      segment.style.setProperty("--mini-chart-segment-color", getSegmentColor(index));
    });

    if (isInitial) {
      const maskCircle = /** @type {SVGCircleElement | null} */ (svg.querySelector("mask circle"));
      if (maskCircle) {
        maskCircle.getBoundingClientRect(); // force reflow
        maskCircle.style.strokeDashoffset = "0";
        
        setTimeout(() => {
          if (maskCircle.isConnected) {
            maskCircle.style.transition = "none"; // Stop transitioning after entrance
          }
        }, 850);
      }
    }
  }
}
