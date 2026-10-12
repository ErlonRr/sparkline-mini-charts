// registration.js — Safe, side-effect-free Custom Element registration helper.

/**
 * Defines a chart tag only when the registry does not already contain it.
 *
 * @param {string} tagName Custom Element tag name.
 * @param {CustomElementConstructor} component Custom Element constructor.
 * @param {CustomElementRegistry | undefined} [registry] Registry to update.
 * @returns {boolean} Whether this call defined the component.
 */
export function defineMiniChart(tagName, component, registry = globalThis.customElements) {
  if (!registry || registry.get(tagName)) return false;

  registry.define(tagName, component);
  return true;
}
