import { SAMPLE_MS } from '../game/market';
import { formatClock } from './format';

const nb2 = (v: number) => v.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Kursgraf: blå linje med lys flate under, 4 verdier på siden og 5 klokkeslett under.
 * `history` = pris hvert 30. sek, `lastSample` = tidspunktet for siste punkt, `price` = prisen nå.
 */
export function stockChart(
  history: number[],
  lastSample: number,
  price: number,
  label: (v: number) => string = nb2,
): string {
  // Siste punkt i historikken er prisen nå (legg den bare til hvis historikken er for kort)
  const points = history.length > 1 ? history : [...history, price];
  let lo = Math.min(...points);
  let hi = Math.max(...points);
  if (hi - lo < hi * 1e-6) {
    hi *= 1.001;
    lo *= 0.999;
  }

  // Linje og flate (koordinater 0–100, strekkes til full størrelse)
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = 100 - ((p - lo) / (hi - lo)) * 100;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M${coords.join(' L')}`;
  const area = `${line} L100,100 L0,100 Z`;

  // Horisontale linjer og verdier på siden
  const levels = [0, 1 / 3, 2 / 3, 1];
  const grid = levels.map((f) => `<line x1="0" x2="100" y1="${f * 100}" y2="${f * 100}"/>`).join('');
  const yLabels = levels
    .map((f) => `<span style="top:${f * 100}%">${label(hi - (hi - lo) * f)}</span>`)
    .join('');

  // Klokkeslett under grafen
  const startTime = lastSample - (history.length - 1) * SAMPLE_MS;
  const endTime = Date.now();
  const xLabels = [0.08, 0.31, 0.54, 0.77, 1]
    .map((f) => `<span style="left:${f * 100}%">${formatClock(startTime + (endTime - startTime) * f)}</span>`)
    .join('');

  return `
    <div class="chart">
      <div class="chart-y">${yLabels}</div>
      <div class="chart-main">
        <div class="chart-plot">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <g class="chart-grid">${grid}</g>
            <path class="chart-area" d="${area}"/>
            <path class="chart-line" d="${line}"/>
          </svg>
        </div>
        <div class="chart-x">${xLabels}</div>
      </div>
    </div>`;
}
