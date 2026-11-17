/**
 * Hele appen tegnes litt mindre enn "normal" størrelse (som i Business Empire).
 * Endre PAGE_ZOOM for å gjøre alt større (f.eks. 0.9) eller mindre (f.eks. 0.8).
 * Verdien legges inn i CSS-variabelen --page-zoom (se main.ts og style.css).
 */
export const PAGE_ZOOM = 0.82;
/** Samme som max-width på #page i style.css. */
export const PAGE_MAX_WIDTH = 560;

export function applyZoom() {
  document.documentElement.style.setProperty('--page-zoom', String(PAGE_ZOOM));
}
