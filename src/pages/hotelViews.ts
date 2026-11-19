import type { Business } from '../game/business';
import {
  CITIES,
  FACILITIES,
  ROOMS,
  STAR_HOURS,
  STAR_MULT,
  canHaveFacility,
  chainIncome,
  cityById,
  facilityById,
  facilityCost,
  hotelBuildHours,
  hotelIn,
  hotelIncome,
  hotelPrice,
  hotelsOf,
  isOpen,
  newHotelIncome,
  roomBuildSeconds,
  roomById,
  roomCost,
  roomCount,
  roomIncome,
  roomsIncome,
  starCost,
  type Hotel,
  type HotelJob,
} from '../game/hotel';
import type { FacilityId, RoomType } from '../game/hotelData';
import type { GameState } from '../game/state';
import { formatDuration, formatInt, formatMoney, formatMoneyFull, formatMoneyWhole } from '../ui/format';
import { icons } from '../ui/icons';

/*
 * Sidene til hotellkjeden:
 *   detail  – oversikt: inntekt, mine hoteller, kjøp nytt hotell
 *   hHotel  – ett hotell: inntekt, rom (fast pris per rom), stjerner, fasiliteter
 *   hCities – byer man kan kjøpe hotell i
 *   hRooms  – bygg flere rom
 */

export const FACILITY_ICON: Record<FacilityId, string> = {
  restaurant: icons.fork,
  bar: icons.cocktail,
  gym: icons.dumbbell,
  pool: icons.waves,
  spa: icons.lotus,
  conference: icons.board,
  casino: icons.dice,
};

export function stars(n: number, max = 5): string {
  return `<span class="ht-stars">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">${icons.starFill}</i>`).join('')}</span>`;
}

const photo = (cityId: string) => `<img src="hotels/${cityId}.jpg" alt="" loading="lazy" />`;
const perHour = (v: number) => `${formatMoney(v)} / t`;

function jobText(job: HotelJob): string {
  switch (job.kind) {
    case 'open':
      return 'Hotellet bygges';
    case 'rooms':
      return `Bygger ${formatInt(job.count)} ${roomById(job.room).name.toLowerCase()}`;
    case 'facility':
      return `Bygger ${facilityById(job.id).name.toLowerCase()}`;
    case 'stars':
      return `Oppgraderer til ${job.to} stjerner`;
  }
}
const jobLeft = (job: HotelJob) => formatDuration((job.end - Date.now()) / 1000);

// =========================================================================
// Forsiden
// =========================================================================
export function renderHotelDetail(state: GameState, b: Business, hero: string): string {
  const list = hotelsOf(b).hotels;
  const income = chainIncome(b);
  const rooms = list.reduce((sum, h) => sum + roomCount(h), 0);
  const cards = list
    .map((h) => {
      const c = cityById(h.city);
      return `
      <button class="ht-card" data-action="h-hotel" data-id="${b.id}" data-city="${h.city}">
        <div class="ht-card-photo">${photo(h.city)}<div><strong>${c.name}</strong><span>${c.country}</span></div>${stars(h.stars)}</div>
        <div class="ht-card-body">
          ${h.job ? `<span class="ht-job-chip">${icons.clock}${jobText(h.job)} · ${jobLeft(h.job)}</span>` : ''}
          <div class="ht-card-stats">
            <div><b>${formatInt(roomCount(h))}</b><span>Rom</span></div>
            <div><b>${h.facilities.length}</b><span>Fasiliteter</span></div>
            <div><b>${isOpen(h) ? formatMoney(hotelIncome(h)) : '–'}</b><span>Per time</span></div>
          </div>
        </div>
      </button>`;
    })
    .join('');
  return `
    ${hero}
    <div class="biz-income-card">
      <strong>${formatMoneyFull(income)}</strong>
      <span>Inntekt per time</span>
    </div>
    <div class="ht-summary">
      <div>${icons.hotel}<b>${list.length}</b><span>Hoteller</span></div>
      <div>${icons.bed}<b>${formatInt(rooms)}</b><span>Rom</span></div>
      <div>${icons.sparkle}<b>${CITIES.length - list.length}</b><span>Ledige byer</span></div>
    </div>
    <h2 class="ht-title">Mine hoteller</h2>
    <div class="ht-cards">${cards}</div>
    <button class="ht-btn" data-action="h-cities" data-id="${b.id}">Kjøp hotell i en ny by</button>
    <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>
    <div class="ht-help">
      <h3>Slik fungerer hotellene</h3>
      <p>Hvert rom tjener en fast sum hver time. Inntekten endres bare når du bygger noe nytt – den går aldri ned av seg selv.</p>
      <p>Bygg flere rom, legg til fasiliteter (gir prosent ekstra for hele hotellet) og oppgrader stjernene (gir mer per rom). Dyrere byer koster mer, men hvert rom tjener også mer.</p>
    </div>`;
}

// =========================================================================
// Ett hotell
// =========================================================================
export function renderHotel(state: GameState, b: Business, h: Hotel, confirm: string | null): string {
  const c = cityById(h.city);
  const income = hotelIncome(h);
  const busy = !!h.job;
  const btn = (key: string, label: string, cost: number) => {
    const sure = confirm === key;
    return `<button class="ht-mini-btn ${state.balance >= cost ? '' : 'poor'} ${sure ? 'confirm' : ''}" data-action="h-do" data-key="${key}" data-id="${b.id}" data-city="${h.city}" ${busy ? 'disabled' : ''}>${sure ? 'Trykk igjen' : label}</button>`;
  };

  // Rom: fast pris per rom per time
  const rooms = ROOMS.map((r) => {
    const locked = h.stars < r.minStars;
    return `
      <div class="ht-row">
        <span class="ht-row-icon">${icons.bed}</span>
        <div class="ht-row-text">
          <strong>${r.name}</strong>
          <span>${locked ? `Krever ${r.minStars} stjerner` : `${formatMoneyWhole(roomIncome(h, r.id))} per rom per time`}</span>
          <span>${formatInt(h.rooms[r.id])} / ${formatInt(r.max)} rom</span>
        </div>
        <button class="ht-mini-btn" data-action="h-rooms" data-id="${b.id}" data-city="${h.city}" data-room="${r.id}" ${locked || busy || h.rooms[r.id] >= r.max ? 'disabled' : ''}>Bygg</button>
      </div>`;
  }).join('');

  // Stjerner
  const next = h.stars + 1;
  let starHtml: string;
  if (h.stars >= 5) starHtml = `<p class="ht-muted">Hotellet har 5 stjerner – det høyeste som finnes.</p>`;
  else {
    const gain = (roomsIncome(h, next) - roomsIncome(h)) * (1 + h.facilities.reduce((s, id) => s + facilityById(id).income, 0));
    const unlock = ROOMS.find((r) => r.minStars === next);
    starHtml = `
      <div class="ht-row">
        <span class="ht-row-icon gold">${icons.starFill}</span>
        <div class="ht-row-text">
          <strong>Oppgrader til ${next} stjerner</strong>
          <span>Alle rom tjener ${Math.round((STAR_MULT[next] / STAR_MULT[h.stars] - 1) * 100)} % mer: <b class="ht-plus">+${perHour(gain)}</b>${unlock ? ` · låser opp ${unlock.name.toLowerCase()}` : ''}</span>
          <span>${formatMoneyWhole(starCost(h))} · ${STAR_HOURS[next]} t</span>
        </div>
        ${btn('stars', 'Oppgrader', starCost(h))}
      </div>`;
  }

  // Fasiliteter
  const base = roomsIncome(h);
  const facilities = FACILITIES.filter((f) => canHaveFacility(h, f.id))
    .map((f) => {
      const owned = h.facilities.includes(f.id);
      const building = h.job?.kind === 'facility' && h.job.id === f.id;
      return `
      <div class="ht-fac ${owned ? 'owned' : ''}">
        <span class="ht-fac-icon">${FACILITY_ICON[f.id]}</span>
        <strong>${f.name}</strong>
        <span>${f.text}</span>
        <small>+${Math.round(f.income * 100)} % · +${perHour(base * f.income)}</small>
        ${owned ? `<b class="ht-owned">${icons.check} Bygget</b>` : building ? `<b class="ht-owned">${icons.clock} ${jobLeft(h.job!)}</b>` : `<em>${formatMoneyWhole(facilityCost(h, f.id))} · ${formatDuration(f.hours * 3600, false)}</em>${btn(`fac:${f.id}`, 'Bygg', facilityCost(h, f.id))}`}
      </div>`;
    })
    .join('');

  return `
    <div class="ht-banner">
      ${photo(h.city)}
      <div class="ht-banner-text"><h1>${c.name}</h1><span>${c.country}</span>${stars(h.stars)}</div>
    </div>
    <div class="biz-income-card ht-income">
      <strong>${formatMoneyFull(income)}</strong>
      <span>Inntekt per time</span>
    </div>
    ${h.job ? `<div class="ht-job">${icons.clock}<div><strong>${jobText(h.job)}</strong><span>Ferdig om ${jobLeft(h.job)}</span></div></div>` : ''}

    <div class="ht-stats">
      <div><span>Rom</span><b>${formatInt(roomCount(h))}</b></div>
      <div><span>Fra rommene</span><b>${perHour(isOpen(h) ? base : 0)}</b></div>
      <div><span>Fasiliteter</span><b>+${Math.round(h.facilities.reduce((s, id) => s + facilityById(id).income, 0) * 100)} %</b></div>
      <div><span>Tjent totalt</span><b>${formatMoney(h.earned)}</b></div>
    </div>

    <h2 class="ht-title">Rom</h2>
    <div class="ht-box">${rooms}</div>

    <h2 class="ht-title">Stjerner</h2>
    <div class="ht-box">${starHtml}</div>

    <h2 class="ht-title">Fasiliteter</h2>
    <div class="ht-facs">${facilities}</div>
    <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>`;
}

// =========================================================================
// Byer og rom
// =========================================================================
export function renderCities(state: GameState, b: Business, confirm: string | null): string {
  const cards = [...CITIES]
    .sort((x, y) => x.mult - y.mult)
    .map((c) => {
      const owned = hotelIn(b, c.id);
      const price = hotelPrice(c);
      const sure = confirm === `buy:${c.id}`;
      return `
      <div class="ht-city ${owned ? 'owned' : ''}">
        <div class="ht-card-photo">${photo(c.id)}<div><strong>${c.name}</strong><span>${c.country}</span></div></div>
        <div class="ht-city-body">
          <span>Starter med <b>${perHour(newHotelIncome(c))}</b>${c.casino ? ' · kasino tillatt' : ''}</span>
          ${owned
            ? `<button class="ht-mini-btn" data-action="h-hotel" data-id="${b.id}" data-city="${c.id}">Se hotellet</button>`
            : `<div class="ht-city-buy"><b>${formatMoneyWhole(price)}</b><span>Ferdig om ${formatDuration(hotelBuildHours(c) * 3600, false)}</span>
               <button class="ht-mini-btn ${state.balance >= price ? '' : 'poor'} ${sure ? 'confirm' : ''}" data-action="h-buy" data-id="${b.id}" data-city="${c.id}">${sure ? 'Trykk igjen' : 'Kjøp'}</button></div>`}
        </div>
      </div>`;
    })
    .join('');
  return `
    <h1 class="con-page-title">Nye byer</h1>
    <p class="ht-muted pad">Et nytt hotell starter med 3 stjerner og 370 rom. Dyre byer koster mer, men hvert rom tjener også mer.</p>
    <div class="ht-cities">${cards}</div>`;
}

export function renderRooms(state: GameState, b: Business, h: Hotel, room: RoomType, qty: number): string {
  const r = roomById(room);
  const left = r.max - h.rooms[room];
  const cost = roomCost(h, room) * qty;
  const gain = roomIncome(h, room) * qty * (1 + h.facilities.reduce((s, id) => s + facilityById(id).income, 0));
  const chips = ROOMS.filter((x) => h.stars >= x.minStars)
    .map((x) => `<button class="taxi-chip big ${x.id === room ? 'active' : ''}" data-action="h-room-type" data-room="${x.id}">${x.name}</button>`)
    .join('');
  const step = (d: number, label: string) => `<button class="ht-qty-btn" data-action="h-qty" data-step="${d}">${label}</button>`;
  return `
    <h1 class="con-page-title">Bygg rom</h1>
    <p class="ht-muted pad">${cityById(h.city).name} · ${formatInt(h.rooms[room])} av ${formatInt(r.max)} ${r.name.toLowerCase()}</p>
    <div class="taxi-chips ht-chips">${chips}</div>
    <div class="ht-box">
      <p class="ht-muted">Hvert ${r.name.toLowerCase()} tjener <b>${formatMoneyWhole(roomIncome(h, room))}</b> per time og koster <b>${formatMoneyWhole(roomCost(h, room))}</b> å bygge.</p>
      <div class="ht-qty"><strong>${formatInt(qty)}</strong><span>rom</span></div>
      <div class="ht-qty-row">${step(-10, '−10')}${step(10, '+10')}${step(50, '+50')}${step(100, '+100')}${step(9999, 'Maks')}</div>
      <div class="ht-ledger">
        <div><span>Pris</span><b>${formatMoneyFull(cost)}</b></div>
        <div><span>Mer inntekt</span><b class="ht-plus">+${perHour(gain)}</b></div>
        <div><span>Byggetid</span><b>${formatDuration(roomBuildSeconds(qty), false)}</b></div>
        <div><span>Plass til flere</span><b>${formatInt(left)}</b></div>
      </div>
      <button class="ht-btn ${state.balance >= cost ? '' : 'poor'}" data-action="h-build-rooms" data-id="${b.id}" data-city="${h.city}" ${qty > 0 ? '' : 'disabled'}>Bygg ${formatInt(qty)} rom</button>
      <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>
    </div>`;
}
