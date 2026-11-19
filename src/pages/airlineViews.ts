import type { Business } from '../game/business';
import {
  CONTINENTS,
  INTL,
  PLANES,
  airlineIncome,
  airlineOf,
  canBuyIntl,
  continentById,
  coverage,
  domesticLaunched,
  freePlanes,
  hasLicense,
  hubsLeased,
  isGrounded,
  launchedIn,
  licensePrice,
  maxAffordable,
  nextFlight,
  nextHub,
  planeById,
  planeCount,
  planesInUse,
  serviceCost,
  unusedValue,
  usedCount,
  LAUNCH_MS,
} from '../game/airline';
import { AIRPORTS, DOMESTIC_COUNT, type ContinentId, type FlightDef, type PlaneId } from '../game/airlineData';
import type { GameState } from '../game/state';
import { formatDuration, formatInt, formatMoney, formatMoneyFull, formatMoneyWhole } from '../ui/format';
import { icons } from '../ui/icons';

/*
 * Sidene til flyselskapet:
 *   detail     – forsiden: inntekt, verdensdekning, kontinentene, flyflåten og lisenser
 *   aRegion    – ett kontinent: neste flyvning (lanser), hubs
 *   aHubs      – lei neste hub, og de som er leid
 *   aFleet     – service, fly i bruk / ledige, selg ledige
 *   aShop      – kjøp fly (med et vindu nederst for antall)
 *   aLicenses  – lisenser for kontinentene og den internasjonale
 */

// --- Små hjelpere -------------------------------------------------------------------------------
const flag = (cc: string) => `<img class="air-flag" src="airline/flags/${cc}.png" alt="" />`;
const globe = (c: ContinentId) => `<img class="air-globe-img" src="airline/globes/${c}.png" alt="" />`;
const planeImg = (p: PlaneId) => `<img class="air-plane-img" src="airline/${p}.png" alt="" loading="lazy" />`;
const flightTime = (min: number) => `${Math.floor(min / 60)}t ${min % 60}m`;
const balanceLine = (state: GameState) => `<p class="air-sub">Saldo: <b>${formatMoneyFull(state.balance)}</b></p>`;
const PLANE_PLURAL: Record<PlaneId, string> = { small: 'Små fly', medium: 'Mellomstore fly', large: 'Store fly', xlarge: 'Ekstra store fly' };
/** Rekkefølgen på knappene på forsiden (Nord-Amerika over hele bredden). */
const GRID: ContinentId[] = ['na', 'as', 'eu', 'sa', 'me', 'af', 'oc'];

/** Ring som viser verdensdekningen. */
function ring(share: number): string {
  const r = 46;
  const len = 2 * Math.PI * r;
  return `
    <svg class="air-ring" viewBox="0 0 110 110" aria-hidden="true">
      <circle cx="55" cy="55" r="${r}" class="track" />
      ${share > 0 ? `<circle cx="55" cy="55" r="${r}" class="fill" stroke-dasharray="${len}" stroke-dashoffset="${len * (1 - share)}" />` : ''}
    </svg>`;
}

// =========================================================================
// Forsiden
// =========================================================================
export function renderAirlineDetail(state: GameState, b: Business, hero: string): string {
  const s = airlineOf(b);
  const grounded = isGrounded(s);
  const income = airlineIncome(b);
  const cover = coverage(s);

  const tiles = GRID.map((id) => {
    const c = continentById(id);
    const owned = hasLicense(s, id);
    const next = owned ? nextFlight(s, id) : null;
    const ready = next?.kind === 'flight';
    return `
      <button class="air-tile ${owned ? 'owned' : 'locked'} ${ready ? 'ready' : ''} ${id === 'na' ? 'wide' : ''}" data-action="a-region" data-id="${b.id}" data-cont="${id}">
        <span class="air-tile-icon">${owned ? icons.plane : icons.lock}</span>
        <span class="air-tile-text"><strong>${c.name}</strong>${owned ? `<small>${launchedIn(s, id)}/${c.flights.length} flyvninger</small>` : ''}</span>
        ${ready ? '<i class="air-dot"></i>' : ''}
      </button>`;
  }).join('');

  const due = s.serviceDue - Date.now();
  const needsService = serviceCost(s) > 0;

  return `
    ${hero}
    <div class="biz-income-card ${grounded ? 'air-grounded' : ''}">
      <strong>${formatMoneyFull(income)}</strong>
      <span>Inntekt per time</span>
    </div>
    ${
      grounded
        ? `<button class="air-alert" data-action="a-fleet" data-id="${b.id}">${icons.wrench}<div><strong>Flyene står på bakken</strong><span>Fristen for service er gått ut, så selskapet tjener ingenting. Trykk her for å utføre service.</span></div></button>`
        : ''
    }

    <section class="air-world">
      <div class="air-world-sky">
        <h2>Flyvninger</h2>
        <span>Verdensdekning: ${Math.floor(cover * 100)} %</span>
        <div class="air-ring-wrap">
          ${ring(cover)}
          <span class="air-ring-plane">${icons.plane}</span>
        </div>
      </div>
      <div class="air-tiles">${tiles}</div>
      <p class="air-hint">Trykk på et område for å styre det</p>
    </section>

    <button class="air-fleet-card" data-action="a-fleet" data-id="${b.id}">
      <img class="air-fleet-img" src="airline/front.png" alt="" />
      <div class="air-fleet-title"><strong>Flyflåten</strong>${icons.chevronRight}</div>
      <div class="air-fleet-stats">
        <div>${icons.plane}<b>${planeCount(s)}</b><span>Antall fly</span></div>
        <div class="${needsService && due < 6 * 3_600_000 ? 'warn' : ''}">${icons.wrench}<b>${needsService ? formatDuration(Math.max(0, due) / 1000, false) : '–'}</b><span>Neste service</span></div>
      </div>
    </button>
    <button class="air-soft-btn" data-action="a-shop" data-id="${b.id}">${icons.plusBox}Kjøp flere fly</button>

    <button class="air-license-card" data-action="a-licenses" data-id="${b.id}">
      <div><strong>Lisenser</strong><span>Innenriks og internasjonale flyvninger</span></div>
      <span class="air-license-icon">${icons.license}</span>
    </button>
    ${balanceLine(state)}

    <div class="air-help">
      <h3>Slik fungerer flyselskapet</h3>
      <p>Kjøp lisens for et kontinent, lei hubs (flyplasser) og kjøp fly. Da kan du lansere flyvninger – hver av dem gir mer inntekt per time. En lansering tar 1 time, og så kommer neste.</p>
      <p>Flyene som er i bruk, må ha service hver 48. time. Går fristen ut, tjener selskapet ingenting før du betaler.</p>
    </div>`;
}

// =========================================================================
// Ett kontinent
// =========================================================================
function routeHtml(f: FlightDef): string {
  const a = AIRPORTS[f.from];
  const z = AIRPORTS[f.to];
  return `
    <div class="air-route">
      <div class="air-end">${flag(a.cc)}<span>${a.city}</span><b>${a.code}</b></div>
      <div class="air-path">
        <svg viewBox="0 0 120 40" aria-hidden="true"><path d="M8 32 Q60 -6 112 32" /><circle cx="8" cy="32" r="3" /><circle cx="112" cy="32" r="3" /></svg>
        <span class="air-path-plane">${icons.plane}</span>
        <small>${flightTime(f.minutes)}</small>
      </div>
      <div class="air-end right">${flag(z.cc)}<span>${z.city}</span><b>${z.code}</b></div>
    </div>`;
}

function flightHead(f: FlightDef, label?: string): string {
  return `
    <div class="air-flight-top">
      <span class="air-badge ${f.intl ? 'intl' : ''}">${icons.plane}</span>
      <div class="air-flight-kind"><strong class="${f.intl ? 'intl' : ''}">${f.intl ? 'Internasjonal' : 'Innenriks'}</strong><span>${label ?? 'Flyvning'}</span></div>
      <div class="air-flight-inc"><b>+ ${formatMoney(f.income)}</b><span>Inntekt / time</span></div>
    </div>`;
}

export function renderRegion(state: GameState, b: Business, id: ContinentId): string {
  const s = airlineOf(b);
  const c = continentById(id);
  const next = nextFlight(s, id);
  let body = '';

  if (next.kind === 'flight') {
    const f = next.flight;
    const free = freePlanes(s, f.plane);
    const enoughPlanes = free >= f.count;
    const enoughMoney = state.balance >= f.cost;
    body = `
      <div class="air-card air-flight">
        ${flightHead(f)}
        ${routeHtml(f)}
        <div class="air-lines">
          <div>${icons.bill}<span>Pris</span><b class="${enoughMoney ? '' : 'short'}">${formatMoney(f.cost)}</b></div>
          <div>${icons.plane}<span>${PLANE_PLURAL[f.plane]} (${planeById(f.plane).name})</span><b class="${enoughPlanes ? '' : 'short'}">${Math.min(free, f.count)}/${f.count}</b></div>
        </div>
      </div>
      <button class="air-btn ${enoughPlanes && enoughMoney ? '' : 'off'}" data-action="a-launch" data-id="${b.id}" data-cont="${id}">Lanser flyvning</button>
      ${enoughPlanes ? '' : `<button class="air-soft-btn" data-action="a-shop" data-id="${b.id}" data-plane="${f.plane}">${icons.plusBox}Kjøp ${f.count - free} fly til</button>`}`;
  } else if (next.kind === 'launching') {
    const f = next.flight;
    const left = Math.max(0, next.readyAt - Date.now());
    body = `
      <div class="air-card air-flight">
        ${flightHead(f, 'Lanseres nå')}
        ${routeHtml(f)}
        <div class="air-progress"><span style="width:${(1 - left / LAUNCH_MS) * 100}%"></span></div>
        <p class="air-muted center">I lufta om <b>${formatDuration(left / 1000)}</b>. Så kommer neste flyvning.</p>
      </div>`;
  } else if (next.kind === 'hub') {
    body = `
      <div class="air-card air-empty">
        <span class="air-empty-icon">${icons.globe}</span>
        <h3>Ingen flyvninger tilgjengelig</h3>
        <button class="air-empty-row" data-action="a-hubs" data-id="${b.id}" data-cont="${id}">${icons.tower}<span>Lei en <b>hub</b> for å lansere flere flyvninger</span></button>
      </div>`;
  } else if (next.kind === 'intl') {
    body = `
      <div class="air-card air-empty">
        <span class="air-empty-icon intl">${icons.plane}</span>
        <h3>Internasjonale flyvninger</h3>
        <button class="air-empty-row" data-action="a-licenses" data-id="${b.id}">${icons.license}<span>Kjøp <b>lisensen</b> for å lansere internasjonale flyvninger</span></button>
      </div>`;
  } else {
    body = `
      <div class="air-card air-empty">
        <span class="air-empty-icon done">${icons.check}</span>
        <h3>Alle flyvningene er lansert</h3>
        <p class="air-muted center">${c.name} er ferdig utbygd.</p>
      </div>`;
  }

  return `
    <div class="air-region-head">
      <div class="air-region-top">
        <div class="air-region-stat">${icons.tower}<b>${hubsLeased(s, id)}/${c.hubs.length}</b><span>Hubs</span></div>
        <div class="air-globe">${globe(id)}</div>
        <div class="air-region-stat">${icons.plane}<b>${launchedIn(s, id)}/${c.flights.length}</b><span>Flyvninger</span></div>
      </div>
      <h1>${c.name}</h1>
    </div>
    <div class="air-region-body">
      ${body}
      <button class="air-card air-hubs-card" data-action="a-hubs" data-id="${b.id}" data-cont="${id}">
        <span class="air-hubs-icon">${icons.tower}</span>
        <div><strong>Hubs</strong><span>Flyplassene selskapet flyr fra i området</span></div>
        ${icons.chevronRight}
      </button>
    </div>`;
}

// =========================================================================
// Hubs
// =========================================================================
function hubHead(code: string, name: string): string {
  return `<div class="air-hub-head"><div><strong>${code}</strong><span>${name}</span></div><span class="air-flag-box">${flag(AIRPORTS[code].cc)}</span></div>`;
}

export function renderHubs(state: GameState, b: Business, id: ContinentId): string {
  const s = airlineOf(b);
  const c = continentById(id);
  const hub = nextHub(s, id);
  const leased = c.hubs.slice(0, hubsLeased(s, id)).reverse();
  const flightsFrom = (i: number) => c.flights.filter((f) => f.hub === i).length;
  const next = hub
    ? `
      <div class="air-hub">
        ${hubHead(hub.code, hub.name)}
        <img class="air-hub-photo" src="airline/hubs/${hub.code}.jpg" alt="" />
        <p class="air-muted">Lei flyplassen for å lansere flyvninger herfra. Det gir <b>${flightsFrom(hubsLeased(s, id))} nye flyvninger</b>.</p>
        <div class="air-buy-row">
          <span class="air-price">${icons.bill}<span><b>${formatMoneyFull(hub.price)}</b><small>Leiepris</small></span></span>
          <button class="air-pill-btn ${state.balance >= hub.price ? '' : 'off'}" data-action="a-hub" data-id="${b.id}" data-cont="${id}">Lei</button>
        </div>
      </div>`
    : `<p class="air-muted center pad">Alle hubene i ${c.name} er leid.</p>`;
  const list = leased
    .map(
      (h) => `
      <div class="air-hub leased">
        ${hubHead(h.code, h.name)}
        <img class="air-hub-photo" src="airline/hubs/${h.code}.jpg" alt="" loading="lazy" />
      </div>`,
    )
    .join('');
  return `
    <h1 class="air-page-title">Hubs</h1>
    ${balanceLine(state)}
    ${next}
    ${leased.length ? `<h2 class="air-title">Leide hubs</h2>${list}` : ''}`;
}

// =========================================================================
// Flyflåten
// =========================================================================
export function renderAirFleet(state: GameState, b: Business, confirmSell: boolean): string {
  const s = airlineOf(b);
  const used = planesInUse(s);
  const cost = serviceCost(s);
  const grounded = isGrounded(s);
  const left = Math.max(0, s.serviceDue - Date.now());

  const usedRows = PLANES.filter((p) => used[p.id] > 0)
    .map(
      (p) => `
      <div class="air-used">
        <div><strong>${p.name}</strong>${planeImg(p.id)}</div>
        <span class="air-count">${used[p.id]} stk.</span>
      </div>`,
    )
    .join('');
  const free = PLANES.filter((p) => freePlanes(s, p.id) > 0)
    .map(
      (p) => `
      <div class="air-free">
        <strong>${p.name}</strong>
        <b>${freePlanes(s, p.id)} stk.</b>
        ${planeImg(p.id)}
      </div>`,
    )
    .join('');

  return `
    <h1 class="air-page-title">Flyflåten</h1>
    ${balanceLine(state)}
    <div class="air-card air-service ${grounded ? 'late' : ''}">
      <div class="air-service-top">
        <span class="air-service-icon">${icons.wrench}</span>
        <div><strong>${cost > 0 ? formatDuration(left / 1000, false) : '–'}</strong><span>Frist for service</span></div>
      </div>
      <div class="air-service-cost"><b>${formatMoneyFull(cost)}</b><span>Pris for service</span></div>
      <p>${
        cost <= 0
          ? 'Ingen fly er i bruk ennå, så det trengs ingen service.'
          : grounded
            ? 'Utfør service for at flyvningene skal tjene penger igjen.'
            : 'Etter fristen stopper inntekten fra flyvningene.'
      }</p>
    </div>
    <button class="air-btn ${cost > 0 ? '' : 'off'}" data-action="a-service" data-id="${b.id}">Utfør service</button>

    <h2 class="air-fleet-head">${icons.checkCircle}I bruk</h2>
    ${usedRows || '<p class="air-muted center">Ingen fly er i bruk ennå.</p>'}

    <h2 class="air-fleet-head off">${icons.pause}Ikke i bruk</h2>
    ${free ? `<div class="air-free-grid">${free}</div>` : '<p class="air-muted center">Ingen ledige fly.</p>'}
    <div class="air-total"><b>${formatMoneyFull(unusedValue(s))}</b><span>Verdi av ledige fly</span></div>
    <button class="air-soft-btn ${unusedValue(s) > 0 ? '' : 'off'} ${confirmSell ? 'confirm' : ''}" data-action="a-sell" data-id="${b.id}">${confirmSell ? 'Trykk igjen for å selge' : 'Selg ledige fly'}</button>
    <p class="air-muted center small">Ledige fly selges for full pris. Antall fly: ${planeCount(s)} (${usedCount(s)} i bruk).</p>`;
}

// =========================================================================
// Kjøp fly
// =========================================================================
export function renderPlaneShop(state: GameState, b: Business, sel: PlaneId | null, qty: number): string {
  const rows = PLANES.map(
    (p) => `
    <button class="air-shop-row ${sel === p.id ? 'sel' : ''}" data-action="a-pick" data-id="${b.id}" data-plane="${p.id}">
      <span class="air-name-pill">${p.name}</span>
      ${planeImg(p.id)}
      <div class="air-shop-info">
        <div>${icons.levels}<span><b>${p.size}</b><small>Flytype</small></span></div>
        <div>${icons.tag}<span><b>${formatMoneyFull(p.price)}</b><small>Pris</small></span></div>
      </div>
    </button>`,
  ).join('');
  const sheet = sel
    ? `
    <div class="air-sheet">
      <div class="air-sheet-title"><strong>Kjøper ${planeById(sel).name}</strong><button data-action="a-unpick" aria-label="Lukk">${icons.close}</button></div>
      <div class="air-sheet-row">
        <div class="air-qty">
          <button data-action="a-qty" data-delta="-1">−</button>
          <b>${qty}</b>
          <button data-action="a-qty" data-delta="1">+</button>
          <button class="max" data-action="a-qty" data-delta="max">Maks</button>
        </div>
        <div class="air-sheet-buy">
          <span>Totalt: <b>${formatMoney(planeById(sel).price * qty)}</b></span>
          <button class="air-btn ${state.balance >= planeById(sel).price * qty ? '' : 'off'}" data-action="a-buy" data-id="${b.id}">Kjøp</button>
        </div>
      </div>
      <small class="air-muted">Du har råd til ${formatInt(maxAffordable(state.balance, sel))}</small>
    </div>`
    : '';
  return `
    <h1 class="air-page-title">Kjøp fly</h1>
    ${balanceLine(state)}
    <div class="air-shop ${sel ? 'with-sheet' : ''}">${rows}</div>
    ${sheet}`;
}

// =========================================================================
// Lisenser
// =========================================================================
export function renderLicenses(state: GameState, b: Business): string {
  const s = airlineOf(b);
  const card = (id: ContinentId) => {
    const c = continentById(id);
    const owned = hasLicense(s, id);
    return `
      <div class="air-lic">
        <div class="air-lic-top">${globe(id)}<div><strong>${c.name}</strong><span>Innenriksflyvninger</span></div></div>
        <div class="air-buy-row">
          <b class="air-lic-price">${formatMoneyWhole(c.license)}</b>
          ${
            owned
              ? `<span class="air-owned">${icons.check} Kjøpt</span>`
              : `<button class="air-pill-btn ${state.balance >= c.license ? '' : 'off'}" data-action="a-license" data-id="${b.id}" data-lic="${id}">Kjøp</button>`
          }
        </div>
      </div>`;
  };
  const done = domesticLaunched(s);
  const intlOwned = hasLicense(s, INTL);
  const ok = canBuyIntl(s);
  return `
    <h1 class="air-page-title">Lisenser</h1>
    ${balanceLine(state)}
    ${CONTINENTS.map((c) => card(c.id)).join('')}
    <div class="air-lic intl">
      <div class="air-lic-top"><span class="air-lic-world">${icons.globe}</span><div><strong>Internasjonal</strong><span>Internasjonale flyvninger</span></div></div>
      ${
        intlOwned
          ? ''
          : `<p class="air-lic-need">Lanser alle innenriksflyvningene</p>
             <div class="air-progress intl"><span style="width:${(done / DOMESTIC_COUNT) * 100}%"></span></div>
             <small class="air-lic-count">${done}/${DOMESTIC_COUNT}</small>`
      }
      <div class="air-buy-row">
        <b class="air-lic-price">${formatMoneyWhole(licensePrice(INTL))}</b>
        ${
          intlOwned
            ? `<span class="air-owned">${icons.check} Kjøpt</span>`
            : `<button class="air-pill-btn intl ${ok && state.balance >= licensePrice(INTL) ? '' : 'off'}" data-action="a-license" data-id="${b.id}" data-lic="${INTL}">Kjøp</button>`
        }
      </div>
    </div>`;
}
