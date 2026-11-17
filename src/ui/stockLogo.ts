import { STOCKS } from '../game/stockData';
import { COINS } from '../game/crypto';

/**
 * Logo for en aksje eller mynt.
 *
 * Har du et logobilde, legg det i mappa public/logos/ med id-en som navn,
 * f.eks. public/logos/tesla.png eller public/logos/bitcoin.png – da brukes bildet automatisk.
 * Ellers vises et rundt merke med farge og forkortelse (f.eks. TSLA).
 */
interface LogoDef {
  id: string;
  ticker: string;
  color: string;
}

const availableLogos = new Set<string>();

/** Sjekker én gang ved oppstart hvilke logobilder som finnes. */
export function initLogos() {
  for (const def of [...STOCKS, ...COINS]) {
    const img = new Image();
    img.onload = () => availableLogos.add(def.id);
    img.src = `logos/${def.id}.png`;
  }
}

/** Lys bakgrunn trenger mørk tekst (f.eks. gule McDonald's). */
function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

export function stockLogo(def: LogoDef, size: 'sm' | 'lg' = 'sm'): string {
  if (availableLogos.has(def.id)) {
    return `<div class="stock-logo stock-logo-${size} has-image"><img src="logos/${def.id}.png" alt=""></div>`;
  }
  // Lange forkortelser får mindre skrift
  const scale = def.ticker.length <= 3 ? 1 : def.ticker.length === 4 ? 0.85 : 0.68;
  const fg = isLight(def.color) ? '#1c2230' : '#ffffff';
  return `<div class="stock-logo stock-logo-${size}" style="--logo-bg:${def.color};--logo-fg:${fg};--logo-scale:${scale}">
    <span>${def.ticker}</span>
  </div>`;
}
