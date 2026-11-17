/** Store tall forkortes: 1,2 mill., 3,4 mrd. osv. */
const UNITS = [
  { size: 1e12, suffix: ' bill.' },
  { size: 1e9, suffix: ' mrd.' },
  { size: 1e6, suffix: ' mill.' },
];

const nb = (value: number, min: number, max: number) =>
  value.toLocaleString('nb-NO', { minimumFractionDigits: min, maximumFractionDigits: max });

/** Et beløp med kroner: 2,50 kr / 1 000,00 kr / 1,2 mill. kr */
export function formatMoney(value: number): string {
  const unit = UNITS.find((u) => Math.abs(value) >= u.size);
  if (unit) return `${nb(value / unit.size, 0, 2)}${unit.suffix} kr`;
  // Rund ned til hele øre, så saldoen aldri ser høyere ut enn den er
  const ore = Math.floor(value * 100 + 1e-6) / 100;
  return `${nb(ore, 2, 2)} kr`;
}

/** Beløp rundet til nærmeste øre (0,672 → 0,67 kr, 0,705 → 0,71 kr). Brukes for per klikk og priser. */
export function formatMoneyRounded(value: number): string {
  if (Math.abs(value) >= 1e6) return formatMoney(value);
  return `${nb(Math.round(value * 100 + 1e-9) / 100, 2, 2)} kr`;
}

/** Fullt beløp uten forkortelse: 11 663 740 781,30 kr */
export function formatMoneyFull(value: number): string {
  return `${nb(value, 2, 2)} kr`;
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

/** Endring med fortegn: "+ 0,31 kr (0,79 %)" / "− 7,79 kr (1,76 %)" */
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
