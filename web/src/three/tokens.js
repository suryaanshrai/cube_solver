/**
 * Reading design tokens back out of CSS for the 3D scene.
 *
 * Three.js can't use a CSS custom property, so without this the renderer would need its
 * own copy of every colour — and a copy is a value that drifts. Resolving them at runtime
 * keeps `tokens.css` the only place any colour is written down, including the colours of
 * the lights.
 */

const FALLBACK = "#808080";

export function readToken(name, fallback = FALLBACK) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function readTokens(names) {
  if (typeof window === "undefined") {
    return Object.fromEntries(names.map((n) => [n, FALLBACK]));
  }
  const styles = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    names.map((n) => [n, styles.getPropertyValue(n).trim() || FALLBACK]),
  );
}
