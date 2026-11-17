/**
 * PENGER VISES I DOLLAR, SOM I ORIGINALAPPEN.
 * Internt er alle beløp i spillet (priser, saldo, inntekter, krav) 10x lavere enn originalen.
 * Når et beløp vises, ganges det med MONEY_SCALE og får "$" foran: 0,26 internt → "$ 2,60".
 * Alle beløp som vises, MÅ derfor gå gjennom funksjonene her.
 */
export const MONEY_SCALE = 10;

/** Store tall forkortes på engelsk: 1,2 M (million), 3,4 B (milliard), 1 T (billion). */
const UNITS = [
  { size: 1e12, suffix: ' T' },
  { size: 1e9, suffix: ' B' },
  { size: 1e6, suffix: ' M' },
];

const nb = (value: number, min: number, max: number) =>
  value.toLocaleString('nb-NO', { minimumFractionDigits: min, maximumFractionDigits: max });

/** Tallet uten "$" (allerede ganget opp). Brukes i grafer. */
function amount(value: number): string {
  const v = value * MONEY_SCALE;
  const unit = UNITS.find((u) => Math.abs(v) >= u.size);
  if (unit) return `${nb(v / unit.size, 0, 2)}${unit.suffix}`;
  // Rund ned til hele cent, så saldoen aldri ser høyere ut enn den er
  return nb(Math.floor(v * 100 + 1e-6) / 100, 2, 2);
}

/** Et beløp: $ 2,50 / $ 1 000,00 / $ 1,2 M */
export function formatMoney(value: number): string {
  return `$ ${amount(value)}`;
}

/** Beløp rundet til nærmeste cent. Brukes for per klikk og priser. */
export function formatMoneyRounded(value: number): string {
  const v = value * MONEY_SCALE;
  if (Math.abs(v) >= 1e6) return formatMoney(value);
  return `$ ${nb(Math.round(v * 100 + 1e-9) / 100, 2, 2)}`;
}

/** Fullt beløp uten forkortelse: $ 116 637 407 813,00 */
export function formatMoneyFull(value: number): string {
  return `$ ${nb(value * MONEY_SCALE, 2, 2)}`;
}

/** Helt beløp uten desimaler: $ 20 000 */
export function formatMoneyWhole(value: number): string {
  return `$ ${formatInt(value * MONEY_SCALE)}`;
}

/** Pris uten "$", også for veldig små priser (krypto). Brukes i grafer. */
export function priceNumber(value: number): string {
  const v = value * MONEY_SCALE;
  if (Math.abs(v) >= 1 || v === 0) return nb(Math.round(v * 100 + 1e-9) / 100, 2, 2);
  return v.toLocaleString('nb-NO', { minimumSignificantDigits: 2, maximumSignificantDigits: 4 });
}

/** Pris som kan være under $ 1 (krypto): $ 95 124,00 / $ 0,2513 / $ 0,00001834 */
export function formatPrice(value: number): string {
  if (Math.abs(value * MONEY_SCALE) >= 1e6) return formatMoney(value);
  return `$ ${priceNumber(value)}`;
}

/** Endring i pris med fortegn, også for små priser: "− $ 0,0012 (0,65 %)" */
export function formatPriceChange(diff: number, pct: number): string {
  return `${diff >= 0 ? '+' : '−'} ${formatPrice(Math.abs(diff))} (${formatPercent(pct)})`;
}

/** Antall mynter: 26 798,00 / 0,0105 / 0,00001234 */
export function formatCoins(value: number): string {
  if (value >= 1 || value === 0) return nb(value, 2, 4);
  return value.toLocaleString('nb-NO', { maximumSignificantDigits: 4, maximumFractionDigits: 8 });
}

/** Heltall med mellomrom: 294 999 989 */
export function formatInt(value: number): string {
  return Math.floor(value).toLocaleString('nb-NO');
}

/** Prosent uten fortegn: 5,32 % */
export function formatPercent(value: number, decimals = 2): string {
  return `${nb(Math.abs(value), decimals, decimals)} %`;
}

/** Svært små prosenter (andel i selskapet): 0,0000037 % */
export function formatSmallPercent(value: number): string {
  if (value === 0) return '0 %';
  if (value >= 0.01) return formatPercent(value);
  return `${value.toLocaleString('nb-NO', { maximumSignificantDigits: 2 })} %`;
}

/** Endring med fortegn: "+ $ 0,31 (0,79 %)" / "− $ 7,79 (1,76 %)" */
export function formatChange(diff: number, pct: number): string {
  const sign = diff >= 0 ? '+' : '−';
  return `${sign} ${formatMoney(Math.abs(diff))} (${formatPercent(pct)})`;
}

/** Endring i prosent med fortegn: "+ 0,79 %" */
export function formatSignedPercent(pct: number): string {
  return `${pct >= 0 ? '+' : '−'} ${formatPercent(pct)}`;
}

/** Klokkeslett: 22.33 */
export function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Varighet: "1 t. 4 min. 59 sek." (eller uten sekunder: "1 t. 4 min."). */
export function formatDuration(seconds: number, withSeconds = true): string {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return withSeconds ? `${h} t. ${m} min. ${s % 60} sek.` : `${h} t. ${m} min.`;
}
