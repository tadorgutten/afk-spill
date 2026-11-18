import type { Business } from '../game/business';
import type { GameState } from '../game/state';
import {
  capacityOptions,
  classesFor,
  FLEET_TEXT,
  FLEET_USAGE,
  fleetOf,
  modelsFor,
  capacityOf,
  carsOf,
  classLabel,
  fleetIncome,
  modelById,
  carImageUrl,
  type CarClass,
  type CarModel,
  type FleetKind,
} from '../game/taxi';
import { formatDuration, formatInt, formatMoney, formatMoneyRounded, formatMoneyWhole } from '../ui/format';
import { icons } from '../ui/icons';

/*
 * Visningene for et taxiselskap:
 *   renderTaxiDetail – selskapet: inntekt, utvid kapasitet, bilpark, "Kjøp en ny bil"
 *   renderCarShop    – velg en bil å kjøpe (kan filtreres på klasse)
 *   renderFleet      – bilene du eier (kan sorteres og filtreres)
 * Trykk håndteres i business.ts (data-action).
 */

export type FleetSort = 'km-desc' | 'km-asc' | 'income-desc';

const FLEET_SORTS: { key: FleetSort; label: string }[] = [
  { key: 'km-desc', label: 'Kjørt lengst' },
  { key: 'km-asc', label: 'Kjørt kortest' },
  { key: 'income-desc', label: 'Høyest inntekt' },
];

/** Ikon for hver flåte. */
const FLEET_ICON: Record<FleetKind, string> = { taxi: icons.taxi, shipping: icons.truck, airline: icons.plane, ships: icons.ship };

/** Enkel tegning av en bil fra siden, i bilens farge. */
export function carArt(color: string): string {
  return `<svg class="car-art" viewBox="0 0 200 80" aria-hidden="true">
    <ellipse cx="100" cy="72" rx="88" ry="5" fill="#000" opacity="0.12"/>
    <path d="M14 56 C14 46 20 42 32 40 L60 37 C72 24 86 18 106 18 C124 18 138 24 150 36 L172 40 C184 42 190 48 190 56 L190 60 C190 63 188 64 185 64 L17 64 C15 64 14 62 14 60 Z" fill="${color}" stroke="#2a2d33" stroke-opacity="0.35" stroke-width="1.5"/>
    <path d="M66 38 C76 27 88 23 102 23 L104 38 Z" fill="#cfe3f2" stroke="#2a2d33" stroke-opacity="0.3"/>
    <path d="M110 23 C126 23 136 28 145 38 L112 38 Z" fill="#cfe3f2" stroke="#2a2d33" stroke-opacity="0.3"/>
    <rect x="176" y="46" width="10" height="5" rx="2" fill="#ffd36e"/>
    <rect x="16" y="46" width="8" height="5" rx="2" fill="#e5484d"/>
    <circle cx="52" cy="62" r="12" fill="#1f2226"/><circle cx="52" cy="62" r="5" fill="#9aa1ab"/>
    <circle cx="150" cy="62" r="12" fill="#1f2226"/><circle cx="150" cy="62" r="5" fill="#9aa1ab"/>
  </svg>`;
}

/** Bilde av bilen. Hvit bakgrunn i bildet "smelter inn" i kortet (se .car-img i taxi.css). */
export function carImage(m: CarModel): string {
  return `<img class="car-img ${m.flip ? 'flip' : ''}" style="--s:${m.scale ?? 1}" src="${carImageUrl(m)}" alt="${m.name}" loading="lazy" />`;
}

const classBadge = (c: CarClass) => `<span class="car-badge cls-${c}">${classLabel(c)}</span>`;

/** Sideveis-scrollbare knapper for bilklassene. Trykk igjen på valgt klasse for å vise alle. */
function classChips(fleet: FleetKind, action: string, selected: CarClass | null): string {
  const chips = classesFor(fleet).map(
    (c) => `<button class="taxi-chip ${selected === c.id ? 'active' : ''}" data-action="${action}" data-class="${c.id}">${c.label}</button>`,
  ).join('');
  return `<div class="taxi-chips">${chips}</div>`;
}

// =========================================================================
// Selskapet
// =========================================================================
export function renderTaxiDetail(state: GameState, b: Business, hero: string): string {
  const cars = carsOf(b).length;
  const capacity = capacityOf(b);
  const pct = capacity > 0 ? Math.round((cars / capacity) * 100) : 0;
  const expanding = b.expansionEnd !== null;
  const fleet = fleetOf(b);
  const text = FLEET_TEXT[fleet];

  const expansion = expanding
    ? `
      <div class="taxi-expanding">
        <div class="taxi-expanding-head">${FLEET_ICON[fleet]}<h2>Utvidelse pågår</h2></div>
        <strong>${formatDuration((b.expansionEnd! - Date.now()) / 1000)}</strong>
        <span>Gjenstående tid · +${b.pendingPlaces ?? 0} plasser</span>
      </div>`
    : `
      <h2 class="taxi-title">Utvid kapasiteten</h2>
      <p class="taxi-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>
      <div class="taxi-options">
        ${capacityOptions(b).map(
          (o, i) => `
          <button class="taxi-option ${state.balance >= o.price ? '' : 'poor'}" data-action="expand-cap" data-id="${b.id}" data-index="${i}">
            <strong>+${o.places} plasser</strong>
            <span>${formatMoneyWhole(o.price)}</span>
          </button>`,
        ).join('')}
      </div>`;

  return `
    ${hero}
    <div class="biz-income-card">
      <strong>${formatMoneyRounded(fleetIncome(b))}</strong>
      <span>Inntekt per time</span>
    </div>
    ${expansion}
    <div class="taxi-fleet-row">
      <button class="taxi-fleet" data-action="fleet" data-id="${b.id}">
        <div class="taxi-fleet-head"><strong>${text.fleet}</strong><span>${pct} %</span></div>
        <div class="taxi-fleet-bar"><span style="width:${pct}%"></span></div>
        <div class="taxi-cars"><span>${text.count}:</span><strong>${cars}</strong></div>
      </button>
      <div class="taxi-capacity">
        <div class="taxi-parking"><span>P</span>${fleet === 'taxi' ? carArtTop() : `<span class="taxi-parking-icon">${FLEET_ICON[fleet]}</span>`}<span>P</span></div>
        <span>Kapasitet:</span>
        <strong>${capacity}</strong>
      </div>
    </div>
    <button class="taxi-buy" data-action="car-shop" data-id="${b.id}">${text.buy}</button>
  `;
}

/** Liten bil sett ovenfra (på parkeringsplassen). */
function carArtTop(): string {
  return `<svg class="car-top" viewBox="0 0 40 70" aria-hidden="true">
    <rect x="4" y="4" width="32" height="62" rx="12" fill="#fff" stroke="#2a2d33" stroke-width="2"/>
    <rect x="9" y="16" width="22" height="12" rx="4" fill="#2a2d33"/>
    <rect x="9" y="42" width="22" height="10" rx="4" fill="#2a2d33"/>
  </svg>`;
}

// =========================================================================
// Kjøp en bil
// =========================================================================
/** Hvor mange av en bil man kan kjøpe nå (ledige plasser og penger). */
export function maxCars(state: GameState, b: Business, modelId: string): number {
  const free = Math.max(0, capacityOf(b) - carsOf(b).length);
  return Math.min(free, Math.floor(state.balance / modelById(modelId).price));
}

export function renderCarShop(
  state: GameState,
  b: Business,
  filter: CarClass | null,
  selected: string | null,
  qty: number,
): string {
  const free = capacityOf(b) - carsOf(b).length;
  const fleet = fleetOf(b);
  const models = modelsFor(fleet).filter((m) => !filter || m.carClass === filter);

  // Kjøpspanelet nederst (når man har trykket på en bil)
  let panel = '';
  if (selected) {
    const m = modelById(selected);
    const max = maxCars(state, b, selected);
    panel = `
      <div class="buy-panel">
        <p class="buy-panel-title">Kjøper ${m.name}</p>
        <div class="buy-panel-row">
          <div class="buy-panel-left">
            <div class="qty">
              <button data-action="qty-minus" aria-label="Færre">−</button>
              <strong>${qty}</strong>
              <button data-action="qty-plus" aria-label="Flere">+</button>
            </div>
            <button class="qty-max" data-action="qty-max">Maks${max > 0 ? ` (${max})` : ''}</button>
          </div>
          <div class="buy-panel-right">
            <span>Sum: <b>${formatMoneyRounded(qty * m.price)}</b></span>
            <button class="buy-panel-buy" data-action="buy-cars" data-id="${b.id}">Kjøp</button>
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="taxi-page-head">
      <h1>${FLEET_TEXT[fleet].choose}</h1>
      <p>Saldo: <b>${formatMoney(state.balance)}</b> · ${free > 0 ? `${free} ledige plasser` : 'Ingen ledige plasser'}</p>
    </div>
    ${classChips(fleet, 'shop-filter', filter)}
    <div class="car-list ${selected ? 'with-panel' : ''}">${models.map((m) => carCard(m, fleet, state.balance >= m.price, m.id === selected)).join('')}</div>
    ${panel}
  `;
}

function carCard(m: CarModel, fleet: FleetKind, affordable: boolean, selected: boolean): string {
  const usage = FLEET_USAGE[fleet];
  return `
    <button class="car-card ${affordable ? '' : 'poor'} ${selected ? 'selected' : ''}" data-action="select-car" data-model="${m.id}">
      <div class="car-card-head"><strong>${m.name}</strong>${classBadge(m.carClass)}</div>
      <div class="car-card-body">
        ${carImage(m)}
        <div class="car-card-info">
          <span><em>${usage.rangeLabel}:</em> ${formatInt(m.range)} ${usage.unit}</span>
          <span><em>Inntekt/t:</em> ${formatMoneyRounded(m.income)}</span>
          <strong>${formatMoneyRounded(m.price)}</strong>
        </div>
      </div>
    </button>`;
}

// =========================================================================
// Bilpark
// =========================================================================
export function renderFleet(b: Business, sort: FleetSort, filter: CarClass | null): string {
  const fleet = fleetOf(b);
  const text = FLEET_TEXT[fleet];
  const sortChips = FLEET_SORTS.map(
    (s) => `<button class="taxi-chip big ${s.key === sort ? 'active' : ''}" data-action="fleet-sort" data-sort="${s.key}">${s.label}</button>`,
  ).join('');

  const value: Record<FleetSort, (km: number, income: number) => number> = {
    'km-desc': (km) => -km,
    'km-asc': (km) => km,
    'income-desc': (_km, income) => -income,
  };
  const cars = carsOf(b)
    .filter((c) => !filter || modelById(c.model).carClass === filter)
    .sort((x, y) => value[sort](x.km, modelById(x.model).income) - value[sort](y.km, modelById(y.model).income));

  const list = cars.length
    ? cars
        .map((c) => {
          const m = modelById(c.model);
          const pct = Math.min(100, (c.km / m.range) * 100);
          return `
          <div class="fleet-car">
            <div class="fleet-car-info">
              <strong>${m.name}</strong>
              <span class="fleet-income"><b>${formatMoneyRounded(m.income)}</b> per time</span>
              <span class="fleet-class">${classLabel(m.carClass)}</span>
            </div>
            ${carImage(m)}
            <div class="fleet-km">
              <span>${formatInt(c.km)} av ${formatInt(m.range)} ${FLEET_USAGE[fleet].unit}</span>
              <div class="fleet-km-bar"><span style="width:${pct.toFixed(1)}%"></span></div>
            </div>
          </div>`;
        })
        .join('')
    : `<div class="empty">
         <svg class="empty-icon" viewBox="0 0 64 64" fill="none" stroke-linecap="round" aria-hidden="true">
           <circle cx="32" cy="32" r="22" stroke="#e6e9ef" stroke-width="5"/>
           <path d="M32 10a22 22 0 1 1-21.5 17.4" stroke="#4f86f7" stroke-width="5"/>
         </svg>
         <h2>${filter ? text.emptyClass : text.empty}</h2>
         <p>${text.hint}</p>
       </div>`;

  return `
    <div class="taxi-page-head"><h1>${text.fleet}</h1></div>
    <div class="taxi-chips">${sortChips}</div>
    ${classChips(fleet, 'fleet-filter', filter)}
    <div class="fleet-list">${list}</div>
  `;
}
