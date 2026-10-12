// presets.js — Named presets the demo registers with defineChartPreset(), offered by the configurator.
// A preset holds options per tag ("*" for every chart); options a chart does not have are ignored.

export const DEMO_PRESETS = Object.freeze({
  smooth: { "*": { curve: "smooth" } },
  dense: { "*": { gap: 0.05, barGap: 0.05, padAngle: 0 }, "mini-line-chart": { points: "none" } },
  rounded: { "*": { radius: 3, roundCaps: true, padAngle: 2 } },
});
