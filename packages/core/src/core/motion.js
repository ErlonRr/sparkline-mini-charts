// motion.js — Tiny shared tween helper for data-update transitions (rAF interpolation, cancellable).

/** Duration of a data-update transition, in milliseconds. */
export const UPDATE_MS = 400;

/**
 * @typedef {Object} TweenState
 * @property {number} raf Pending animation frame.
 * @property {(t: number) => void} frame Draws the eased progress `t` in [0, 1].
 */

/** @type {WeakMap<object, TweenState>} One running tween per chart. */
const running = new WeakMap();

/** @type {WeakMap<object, boolean>} Whether each chart has a layout box, as its ResizeObserver last saw it. */
const layouts = new WeakMap();

/**
 * Records whether a chart has a layout box (from its ResizeObserver), so a
 * tween does not have to read the layout.
 *
 * @param {object} chart Chart element.
 * @param {boolean | undefined} laidOut Whether it has a box; `undefined` forgets it.
 */
export function setLayout(chart, laidOut) {
  if (laidOut === undefined) layouts.delete(chart);
  else layouts.set(chart, laidOut);
}

/** @type {WeakMap<object, number>} Entries dropped at the start by the last `appendData()`, until the chart renders. */
const slides = new WeakMap();

/**
 * Ease-out cubic.
 *
 * @param {number} t Linear progress in [0, 1].
 * @returns {number} Eased progress.
 */
export const easeOut = (t) => 1 - (1 - t) ** 3;

/** Updates closer together than this (ms) belong to a stream. */
const STREAM_GAP_MS = 1500;

/** @type {WeakMap<object, { at: number, streak: number }>} When each chart's last tween started, and how many in a row were close together. */
const cadence = new WeakMap();

/**
 * Picks the duration and the easing of a tween.
 *
 * A single update eases out over `duration`. Once updates keep arriving
 * (`appendData()` on a timer), each one would otherwise rush and then stall,
 * restarting at full speed every time. From the third close update on, the
 * tween lasts as long as the gap since the previous one and is linear, so
 * the next one starts at the speed the last one ended with.
 *
 * @param {object} chart Chart element.
 * @param {number} duration Duration of a single update, in milliseconds.
 * @returns {{ duration: number, ease: (t: number) => number }}
 */
function pace(chart, duration) {
  const now = typeof performance === "object" ? performance.now() : Date.now();
  const before = cadence.get(chart);
  const gap = before ? now - before.at : Number.POSITIVE_INFINITY;
  const streak = gap < STREAM_GAP_MS ? (before?.streak ?? 0) + 1 : 0;
  cadence.set(chart, { at: now, streak });
  if (streak < 2) return { duration, ease: easeOut };
  return { duration: Math.min(STREAM_GAP_MS, Math.max(duration / 2, gap)), ease: (t) => t };
}

/**
 * Linear interpolation.
 *
 * @param {number} from Start value.
 * @param {number} to End value.
 * @param {number} t Progress in [0, 1].
 * @returns {number}
 */
export const lerp = (from, to, t) => (t >= 1 ? to : from + (to - from) * t);

/**
 * Whether a chart may animate a data update: its `motion` option is not
 * `"reduce"`, the page does not prefer reduced motion, the page is visible
 * and the chart is laid out (a hidden chart, SSR or a test DOM without
 * layout draws the final state at once).
 *
 * @param {{ option?(name: string): unknown, getBoundingClientRect?(): { width: number, height: number } }} chart Chart element.
 * @returns {boolean}
 */
export function motionAllowed(chart) {
  if (chart.option?.("motion") === "reduce") return false;
  if (typeof requestAnimationFrame !== "function" || typeof globalThis.matchMedia !== "function") return false;
  if (globalThis.document?.hidden) return false;
  // The size the chart's ResizeObserver saw last, else a layout read.
  let laidOut = layouts.get(chart);
  if (laidOut === undefined) {
    const box = chart.getBoundingClientRect?.();
    laidOut = Boolean(box && (box.width > 0 || box.height > 0));
  }
  if (!laidOut) return false;
  return !globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Stops the chart's running tween. With `finish`, its last frame is drawn first.
 *
 * @param {object} chart Chart element.
 * @param {boolean} [finish] Whether to draw the final state.
 */
export function stopTween(chart, finish = false) {
  const state = running.get(chart);
  if (!state) return;
  running.delete(chart);
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(state.raf);
  if (finish) state.frame(1);
}

/**
 * Runs `frame(t)` with an eased `t` from 0 to 1 on animation frames, after
 * cancelling the chart's previous tween (whose current, half-way state is
 * where the new one starts). Without motion, `frame(1)` runs at once.
 *
 * @param {{ option?(name: string): unknown }} chart Chart element.
 * @param {(t: number) => void} frame Draws one state.
 * @param {number} [duration] Duration in milliseconds.
 */
export function tween(chart, frame, duration = UPDATE_MS) {
  stopTween(chart);
  if (!motionAllowed(chart) || duration <= 0) {
    frame(1);
    return;
  }

  const { duration: span, ease } = pace(chart, duration);
  frame(0);
  /** @type {number | null} */
  let start = null;
  /** @type {TweenState} */
  const state = { raf: 0, frame };
  const step = (/** @type {number} */ now) => {
    start ??= now;
    const progress = Math.min(1, (now - start) / span);
    frame(ease(progress));
    if (progress < 1 && running.get(chart) === state) state.raf = requestAnimationFrame(step);
    else if (running.get(chart) === state) running.delete(chart);
  };
  state.raf = requestAnimationFrame(step);
  running.set(chart, state);
}

/**
 * @typedef {Object} AttributeTarget
 * @property {Element} el Node whose numeric attributes move.
 * @property {Record<string, number>} to Final attribute values.
 * @property {Record<string, number>} [from] Start values; by default the node's current attributes (a half-way tween continues from where it is).
 */

/**
 * Builds a frame function that interpolates numeric attributes.
 *
 * @param {AttributeTarget[]} targets Nodes and their final values.
 * @returns {(t: number) => void} Frame function for `tween()`.
 */
export function attributeFrames(targets) {
  const plan = targets.map(({ el, to, from }) => ({
    el,
    attrs: Object.entries(to).map(([name, end]) => {
      const current = from?.[name] ?? Number.parseFloat(el.getAttribute(name) ?? "");
      return /** @type {[string, number, number]} */ ([name, Number.isFinite(current) ? current : end, end]);
    }),
  }));
  return (t) => {
    for (const { el, attrs } of plan) {
      for (const [name, start, end] of attrs) el.setAttribute(name, String(lerp(start, end, t)));
    }
  };
}

/**
 * Reads numeric attributes of a node.
 *
 * @param {Element} el Node.
 * @param {readonly string[]} names Attribute names.
 * @returns {Record<string, number> | null} The values, or `null` when one is missing.
 */
export function readAttributes(el, names) {
  /** @type {Record<string, number>} */
  const values = {};
  for (const name of names) {
    const value = Number.parseFloat(el.getAttribute(name) ?? "");
    if (!Number.isFinite(value)) return null;
    values[name] = value;
  }
  return values;
}

/**
 * @typedef {{ x: number, y: number }} Point
 */

/**
 * Resizes a point list to `length`: extra points repeat the last one.
 *
 * @template {Point} P
 * @param {readonly P[]} points Points (at least one).
 * @param {number} length Wanted length.
 * @returns {P[]}
 */
export function padPoints(points, length) {
  const result = points.slice(0, length);
  while (result.length < length) result.push(points[points.length - 1]);
  return result;
}

/**
 * Prepares the start and end point lists of a series transition.
 *
 * Without a slide, the previous points are padded or cut to the new length.
 * After `appendData()` dropped `slide` entries, each kept datum moves from
 * its old position to its new one, the dropped points leave on the left as
 * "ghosts" (kept in `to` before the new points), and appended ones grow from
 * the old last point.
 *
 * @param {readonly Point[]} previous Points on screen now.
 * @param {readonly Point[]} next Final points.
 * @param {number} slide Entries dropped at the start.
 * @returns {{ from: Point[], to: Point[], ghosts: number }}
 */
export function seriesTransition(previous, next, slide) {
  if (previous.length === 0 || next.length === 0) return { from: [...next], to: [...next], ghosts: 0 };
  if (slide > 0 && slide < previous.length) {
    const step = next.length > 1 ? next[1].x - next[0].x : 0;
    const ghosts = previous.slice(0, slide).map((point, index) => ({ x: next[0].x - (slide - index) * step, y: point.y }));
    const to = [...ghosts, ...next];
    return { from: padPoints(previous, to.length), to, ghosts: slide };
  }
  return { from: padPoints(previous, next.length), to: [...next], ghosts: 0 };
}

/**
 * Interpolates two point lists of the same length.
 *
 * @param {readonly Point[]} from Start points.
 * @param {readonly Point[]} to End points.
 * @param {number} t Progress.
 * @returns {Point[]}
 */
export function lerpPoints(from, to, t) {
  return to.map((end, index) => {
    const start = from[index] ?? end;
    return { x: lerp(start.x, end.x, t), y: lerp(start.y, end.y, t) };
  });
}

/**
 * Records that the next render follows an `appendData()` that dropped
 * `count` entries at the start.
 *
 * @param {object} chart Chart element.
 * @param {number} count Dropped entries.
 */
export function setSlide(chart, count) {
  if (count > 0) slides.set(chart, count);
  else slides.delete(chart);
}

/**
 * Reads and clears the slide of the next render.
 *
 * @param {object} chart Chart element.
 * @returns {number} Entries dropped at the start (0 without a slide).
 */
export function takeSlide(chart) {
  const count = slides.get(chart) ?? 0;
  slides.delete(chart);
  return count;
}
