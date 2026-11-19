import type { Business } from '../game/business';
import {
  CITIES,
  FACILITIES,
  PRICE_RANGE,
  ROOMS,
  STAR_FACILITIES,
  canHaveFacility,
  chainIncome,
  cityById,
  facilityById,
  facilityCost,
  hotelBuildHours,
  hotelIn,
  hotelNumbers,
  hotelPrice,
  hotelsOf,
  isOpen,
  latestReviews,
  renovateCost,
  reviewScore,
  roomBuildSeconds,
  roomById,
  roomCost,
  roomCount,
  seasonFactor,
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
 *   detail  – oversikt: inntekt, nøkkeltall, mine hoteller, kjøp nytt hotell
 *   hHotel  – ett hotell: belegg, vurdering, tilstand, pris, rom, stjerner, fasiliteter, regnskap, anmeldelser
 *   hCities – byer man kan kjøpe hotell i
 *   hRooms  – bygg flere rom
 *   hPrice  – velg prisnivå (lagres først når man trykker "Lagre")
 */

const pct = (v: number) => `${Math.round(v * 100)} %`;
const signedPct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v * 100))} %`;

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

function seasonLabel(f: number): string {
  if (f >= 1.25) return 'Høysesong';
  if (f >= 1.05) return 'God sesong';
  if (f > 0.85) return 'Normal sesong';
  return 'Lavsesong';
}

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
    case 'renovate':
      return 'Renovering (halvt belegg)';
  }
}
const jobLeft = (job: HotelJob) => formatDuration((job.end - Date.now()) / 1000);

// =========================================================================
// Forsiden
// =========================================================================
export function renderHotelDetail(state: GameState, b: Business, hero: string): string {
  const list = hotelsOf(b).hotels;
  const income = chainIncome(b);
  const open = list.filter(isOpen);
  const rooms = list.reduce((sum, h) => sum + roomCount(h), 0);
  const occ = open.length ? open.reduce((sum, h) => sum + hotelNumbers(h).occupancy * roomCount(h), 0) / Math.max(1, open.reduce((s, h) => s + roomCount(h), 0)) : 0;
  const cards = list
    .map((h) => {
      const c = cityById(h.city);
      const n = hotelNumbers(h);
      return `
      <button class="ht-card" data-action="h-hotel" data-id="${b.id}" data-city="${h.city}">
        <div class="ht-card-photo">${photo(h.city)}<div><strong>${c.name}</strong><span>${c.country}</span></div>${stars(h.stars)}</div>
        <div class="ht-card-body">
          ${h.job ? `<span class="ht-job-chip">${icons.clock}${jobText(h.job)} · ${jobLeft(h.job)}</span>` : ''}
          ${n.event ? `<span class="ht-event-chip">${icons.sparkle}${n.event}</span>` : ''}
          <div class="ht-card-stats">
            <div><b>${isOpen(h) ? pct(n.occupancy) : '–'}</b><span>Belegg</span></div>
            <div><b>${reviewScore(h).toFixed(1)}</b><span>Vurdering</span></div>
            <div><b class="${n.net < 0 ? 'ht-neg' : ''}">${formatMoney(n.net)}</b><span>Per time</span></div>
          </div>
          <div class="ht-cond"><span style="width:${h.condition}%" class="${h.condition < 40 ? 'low' : ''}"></span></div>
          <small class="ht-cond-label">Tilstand ${Math.round(h.condition)} %${h.condition < 40 ? ' – bør renoveres' : ''}</small>
        </div>
      </button>`;
    })
    .join('');
  return `
    ${hero}
    <div class="biz-income-card">
      <strong class="${income < 0 ? 'ht-neg' : ''}">${formatMoneyFull(income)}</strong>
      <span>Inntekt per time</span>
    </div>
    <div class="ht-summary">
      <div>${icons.hotel}<b>${list.length}</b><span>Hoteller</span></div>
      <div>${icons.bed}<b>${formatInt(rooms)}</b><span>Rom</span></div>
      <div>${icons.person}<b>${pct(occ)}</b><span>Belegg</span></div>
    </div>
    <h2 class="ht-title">Mine hoteller</h2>
    <div class="ht-cards">${cards}</div>
    <button class="ht-btn" data-action="h-cities" data-id="${b.id}">Kjøp hotell i en ny by</button>
    <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>
    <div class="ht-help">
      <h3>Slik fungerer hotellene</h3>
      <p>Hvert hotell tjener penger hver time. Hvor mange rom som blir leid ut (belegg), avhenger av prisen du setter, gjestevurderingen, tilstanden og sesongen i byen. Helger og store hendelser i byen gir flere gjester.</p>
      <p>Bygg flere rom, nye fasiliteter og flere stjerner for å tjene mer. Hotellene slites over tid – renover dem så gjestene blir fornøyde.</p>
    </div>`;
}

// =========================================================================
// Ett hotell
// =========================================================================
export function renderHotel(state: GameState, b: Business, h: Hotel, confirm: string | null): string {
  const c = cityById(h.city);
  const n = hotelNumbers(h);
  const season = seasonFactor(c, Date.now());
  const busy = !!h.job;
  const btn = (key: string, label: string, cost: number, extra = '') => {
    const sure = confirm === key;
    return `<button class="ht-mini-btn ${state.balance >= cost ? '' : 'poor'} ${sure ? 'confirm' : ''}" data-action="h-do" data-key="${key}" data-id="${b.id}" data-city="${h.city}" ${busy ? 'disabled' : ''} ${extra}>${sure ? 'Trykk igjen' : label}</button>`;
  };

  // Rom
  const rooms = ROOMS.map((r) => {
    const locked = h.stars < r.minStars;
    return `
      <div class="ht-row">
        <span class="ht-row-icon">${icons.bed}</span>
        <div class="ht-row-text"><strong>${r.name}</strong><span>${formatInt(h.rooms[r.id])} / ${formatInt(r.max)} rom${locked ? ` · krever ${r.minStars} stjerner` : ''}</span></div>
        <button class="ht-mini-btn" data-action="h-rooms" data-id="${b.id}" data-city="${h.city}" data-room="${r.id}" ${locked || busy || h.rooms[r.id] >= r.max ? 'disabled' : ''}>Bygg</button>
      </div>`;
  }).join('');

  // Stjerner
  const next = h.stars + 1;
  const needFac = STAR_FACILITIES[next] ?? 0;
  let starHtml: string;
  if (h.stars >= 5) starHtml = `<p class="ht-muted">Hotellet har 5 stjerner – det høyeste som finnes.</p>`;
  else {
    const missing = h.facilities.length < needFac ? `Krever ${needFac} fasiliteter (har ${h.facilities.length})` : next === 5 && h.condition < 80 ? 'Krever tilstand over 80 %' : '';
    starHtml = `
      <div class="ht-row">
        <span class="ht-row-icon gold">${icons.starFill}</span>
        <div class="ht-row-text"><strong>Oppgrader til ${next} stjerner</strong><span>${formatMoneyWhole(starCost(h))} · ${next === 5 ? 6 : 2} t · ${missing || `inntekten per rom øker med ${Math.round(((next === 5 ? 2.3 : 1.5) / (next === 5 ? 1.5 : 1) - 1) * 100)} %`}</span></div>
        ${missing ? '<button class="ht-mini-btn" disabled>Låst</button>' : btn('stars', 'Oppgrader', starCost(h))}
      </div>`;
  }

  // Fasiliteter
  const facilities = FACILITIES.filter((f) => canHaveFacility(h, f.id))
    .map((f) => {
      const owned = h.facilities.includes(f.id);
      const building = h.job?.kind === 'facility' && h.job.id === f.id;
      return `
      <div class="ht-fac ${owned ? 'owned' : ''}">
        <span class="ht-fac-icon">${FACILITY_ICON[f.id]}</span>
        <strong>${f.name}</strong>
        <span>${f.text}</span>
        <small>+${Math.round(f.income * 100)} % inntekt · +${f.review.toFixed(2).replace('.', ',')} vurdering</small>
        ${owned ? `<b class="ht-owned">${icons.check} Bygget</b>` : building ? `<b class="ht-owned">${icons.clock} ${jobLeft(h.job!)}</b>` : `<em>${formatMoneyWhole(facilityCost(h, f.id))} · ${formatDuration(f.hours * 3600, false)}</em>${btn(`fac:${f.id}`, 'Bygg', facilityCost(h, f.id))}`}
      </div>`;
    })
    .join('');

  const reviews = latestReviews(h)
    .map(
      (r) => `
      <div class="ht-review">
        <div><strong>${r.name}</strong><span>${r.country}</span><b class="${r.score >= 8 ? 'good' : r.score < 5 ? 'bad' : ''}">${r.score.toFixed(1).replace('.', ',')}</b></div>
        <p>${r.text}</p>
      </div>`,
    )
    .join('');

  return `
    <div class="ht-banner">
      ${photo(h.city)}
      <div class="ht-banner-text"><h1>${c.name}</h1><span>${c.country}</span>${stars(h.stars)}</div>
    </div>
    <div class="biz-income-card ht-income">
      <strong class="${n.net < 0 ? 'ht-neg' : ''}">${formatMoneyFull(n.net)}</strong>
      <span>Inntekt per time</span>
    </div>
    ${h.job ? `<div class="ht-job">${icons.clock}<div><strong>${jobText(h.job)}</strong><span>Ferdig om ${jobLeft(h.job)}</span></div></div>` : ''}
    ${n.event ? `<div class="ht-event">${icons.sparkle}<div><strong>I dag: ${n.event}</strong><span>Mange flere gjester i byen hele dagen!</span></div></div>` : ''}

    <div class="ht-stats">
      <div><span>Belegg</span><b>${isOpen(h) ? pct(n.occupancy) : '–'}</b></div>
      <div><span>Gjestevurdering</span><b>${reviewScore(h).toFixed(1).replace('.', ',')} / 10</b></div>
      <div><span>Sesong nå</span><b>${seasonLabel(season)}</b></div>
      <div><span>Prisnivå</span><b>${signedPct(h.price)}</b></div>
    </div>

    <h2 class="ht-title">Tilstand</h2>
    <div class="ht-box">
      <div class="ht-cond big"><span style="width:${h.condition}%" class="${h.condition < 40 ? 'low' : ''}"></span></div>
      <p class="ht-muted">Tilstand ${Math.round(h.condition)} %. Hotellet slites litt hver time. Over 80 % merkes det ikke, men under 80 % gir det dårligere vurdering og færre gjester.</p>
      <div class="ht-row">
        <span class="ht-row-icon">${icons.broom}</span>
        <div class="ht-row-text"><strong>Renover</strong><span>${formatMoneyWhole(renovateCost(h))} · 30 min · halvt belegg mens det pågår</span></div>
        ${btn('renovate', 'Renover', renovateCost(h))}
      </div>
    </div>

    <h2 class="ht-title">Pris</h2>
    <div class="ht-box">
      <p class="ht-muted">Lavere pris gir flere gjester og bedre vurdering. Høyere pris gir mer per gjest, men færre gjester. I høysesong tåler gjestene høyere priser.</p>
      <button class="ht-btn soft" data-action="h-price" data-id="${b.id}" data-city="${h.city}">Endre pris (nå ${signedPct(h.price)})</button>
    </div>

    <h2 class="ht-title">Rom</h2>
    <div class="ht-box">${rooms}</div>

    <h2 class="ht-title">Stjerner</h2>
    <div class="ht-box">${starHtml}</div>

    <h2 class="ht-title">Fasiliteter</h2>
    <div class="ht-facs">${facilities}</div>

    <h2 class="ht-title">Regnskap per time</h2>
    <div class="ht-box ht-ledger">
      <div><span>Romsinntekt</span><b>${formatMoney(n.roomRevenue)}</b></div>
      <div><span>Fasiliteter</span><b>${formatMoney(n.facilityRevenue)}</b></div>
      <div><span>Renhold og ansatte</span><b class="ht-neg">−${formatMoney(n.costs).replace('$ ', '$ ')}</b></div>
      <div class="sum"><span>Netto</span><b class="${n.net < 0 ? 'ht-neg' : ''}">${formatMoney(n.net)}</b></div>
      <div><span>Tjent totalt</span><b>${formatMoney(h.earned)}</b></div>
    </div>

    <h2 class="ht-title">Siste anmeldelser</h2>
    <div class="ht-reviews">${reviews}</div>
    <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>`;
}

// =========================================================================
// Byer, rom og pris
// =========================================================================
export function renderCities(state: GameState, b: Business, confirm: string | null): string {
  const now = Date.now();
  const cards = [...CITIES]
    .sort((x, y) => x.mult - y.mult)
    .map((c) => {
      const owned = hotelIn(b, c.id);
      const price = hotelPrice(c);
      const season = seasonFactor(c, now);
      const sure = confirm === `buy:${c.id}`;
      return `
      <div class="ht-city ${owned ? 'owned' : ''}">
        <div class="ht-card-photo">${photo(c.id)}<div><strong>${c.name}</strong><span>${c.country}</span></div></div>
        <div class="ht-city-body">
          <span>Prisnivå: <b>${c.mult.toLocaleString('nb-NO')} × Oslo</b> · ${seasonLabel(season)} nå</span>
          <span>Hendelser: ${c.events.join(', ')}${c.casino ? ' · Kasino tillatt' : ''}</span>
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
    <p class="ht-muted pad">Et nytt hotell starter med 3 stjerner og 370 rom. Dyre byer koster mer, men gjestene betaler også mer.</p>
    <div class="ht-cities">${cards}</div>`;
}

export function renderRooms(state: GameState, b: Business, h: Hotel, room: RoomType, qty: number): string {
  const r = roomById(room);
  const left = r.max - h.rooms[room];
  const cost = roomCost(h, room) * qty;
  const chips = ROOMS.filter((x) => h.stars >= x.minStars)
    .map((x) => `<button class="taxi-chip big ${x.id === room ? 'active' : ''}" data-action="h-room-type" data-room="${x.id}">${x.name}</button>`)
    .join('');
  const step = (d: number, label: string) => `<button class="ht-qty-btn" data-action="h-qty" data-step="${d}">${label}</button>`;
  return `
    <h1 class="con-page-title">Bygg rom</h1>
    <p class="ht-muted pad">${cityById(h.city).name} · ${formatInt(h.rooms[room])} av ${formatInt(r.max)} ${r.name.toLowerCase()}</p>
    <div class="taxi-chips ht-chips">${chips}</div>
    <div class="ht-box">
      <p class="ht-muted">Et ${r.name.toLowerCase()} tjener ${r.factor.toLocaleString('nb-NO')} ganger så mye som et standardrom. Pris per rom: <b>${formatMoneyWhole(roomCost(h, room))}</b></p>
      <div class="ht-qty"><strong>${formatInt(qty)}</strong><span>rom</span></div>
      <div class="ht-qty-row">${step(-10, '−10')}${step(10, '+10')}${step(50, '+50')}${step(100, '+100')}${step(9999, 'Maks')}</div>
      <div class="ht-ledger">
        <div><span>Pris</span><b>${formatMoneyFull(cost)}</b></div>
        <div><span>Byggetid</span><b>${formatDuration(roomBuildSeconds(qty), false)}</b></div>
        <div><span>Plass til flere</span><b>${formatInt(left)}</b></div>
      </div>
      <button class="ht-btn ${state.balance >= cost ? '' : 'poor'}" data-action="h-build-rooms" data-id="${b.id}" data-city="${h.city}" ${qty > 0 ? '' : 'disabled'}>Bygg ${formatInt(qty)} rom</button>
      <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>
    </div>`;
}

export function renderPrice(b: Business, h: Hotel, price: number): string {
  return `
    <h1 class="con-page-title">Pris</h1>
    <p class="ht-muted pad">${cityById(h.city).name}: velg hvor mye dyrere eller billigere enn markedet hotellet skal være.</p>
    <input class="bank-slider ht-slider" type="range" min="${PRICE_RANGE[0]}" max="${PRICE_RANGE[1]}" step="0.01" value="${price}" data-hprice />
    <p class="bank-value">Prisnivå: <b data-hprice-value>${signedPct(price)}</b></p>
    <div class="ht-box ht-ledger" data-hprice-preview>${pricePreview(h, price)}</div>
    <button class="ht-btn" data-action="h-price-save" data-id="${b.id}" data-city="${h.city}">Lagre prisen</button>
    <button class="ht-btn soft" data-action="h-price-default" data-id="${b.id}" data-city="${h.city}">Markedspris (0 %)</button>
    <p class="ht-muted">Tallene gjelder akkurat nå (sesong, ukedag og hendelser endrer seg).</p>`;
}

export function pricePreview(h: Hotel, price: number): string {
  const n = hotelNumbers(h, Date.now(), price);
  return `
    <div><span>Belegg</span><b>${pct(n.occupancy)}</b></div>
    <div><span>Gjestevurdering</span><b>${reviewScore({ ...h, price }).toFixed(1).replace('.', ',')} / 10</b></div>
    <div class="sum"><span>Inntekt per time</span><b class="${n.net < 0 ? 'ht-neg' : ''}">${formatMoney(n.net)}</b></div>`;
}

/** Oppdaterer tallene mens man drar i prisen (uten å tegne siden på nytt). */
export function bindHotelPrice(root: HTMLElement, h: Hotel, onChange: (price: number) => void) {
  const input = root.querySelector<HTMLInputElement>('[data-hprice]');
  if (!input) return;
  const refresh = () => {
    const price = Number(input.value);
    root.querySelector('[data-hprice-value]')!.textContent = signedPct(price);
    root.querySelector('[data-hprice-preview]')!.innerHTML = pricePreview(h, price);
    const p = ((price - PRICE_RANGE[0]) / (PRICE_RANGE[1] - PRICE_RANGE[0])) * 100;
    input.style.setProperty('--fill', `${p}%`);
    onChange(price);
  };
  input.addEventListener('input', refresh);
  refresh();
}
