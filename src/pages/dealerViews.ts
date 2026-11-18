import type { Business } from '../game/business';
import {
  apparentCondition,
  averageValue,
  dealerModel,
  dealerOf,
  diagnosticsCost,
  DIAG_ACCURACY,
  EXPANSIONS,
  forSale,
  inService,
  marketOf,
  marketValue,
  netIncome,
  nextLevelAt,
  nextMarketRefresh,
  partCondition,
  partRepairCost,
  PARTS,
  pendingCars,
  repairCost,
  repairingCars,
  repairMinutes,
  SEGMENT_CHANGE_MS,
  SEGMENTS,
  segmentById,
  showroomValue,
  skillAccuracy,
  type DealerCar,
  type MarketCar,
  type PartId,
  type SegmentId,
} from '../game/dealer';
import type { GameState } from '../game/state';
import { formatBalance, formatDuration, formatInt, formatMoneyFull, formatMoneyWhole } from '../ui/format';
import { icons } from '../ui/icons';

/*
 * Sidene til bilforhandleren (trykk håndteres i business.ts):
 *   detail     – forsiden: verksted, utstilling, marked, spesialisering, forbedringer
 *   service    – bilene på verkstedet (Alle / Under reparasjon / Venter)
 *   showroom   – bilene til salgs
 *   market     – bruktbilmarkedet (100 biler)
 *   marketCar  – én bil i markedet: tilstand (spenn), diagnose, kjøp
 *   car        – én bil du eier: tilstand, reparasjon, statistikk, sett ut for salg
 *   spec       – spesialisering (hvilke biler som er i markedet)
 *   expand     – utvid verkstedet eller utstillingen
 *   skills     – ferdigheter
 */

export type ServiceFilter = 'all' | 'progress' | 'pending';

export const PART_ICON: Record<PartId, string> = {
  engine: icons.engine,
  transmission: icons.transmission,
  chassis: icons.chassis,
  body: icons.carBody,
  electrics: icons.electrics,
  interior: icons.seat,
};

/** Farge etter tilstand: rød, gul eller grønn. */
const condColor = (c: number) => (c < 0.4 ? '#d9534f' : c < 0.75 ? '#e2b532' : '#4caf63');
const pct = (x: number) => `${Math.round(Math.min(1, Math.max(0, x)) * 1000) / 10}%`;

/** Strek med spenn: helt farget opp til laveste mulige, lysere frem til høyeste mulige. */
function rangeBar(lo: number, hi: number): string {
  return `<div class="dl-bar" style="--c:${condColor((lo + hi) / 2)}"><span class="lo" style="width:${pct(lo)}"></span><span class="mid" style="left:${pct(lo)};width:${pct(hi - lo)}"></span></div>`;
}
/** Strek med den ekte tilstanden. */
function exactBar(c: number): string {
  return `<div class="dl-bar" style="--c:${condColor(c)}"><span class="lo" style="width:${pct(c)}"></span></div>`;
}

const carImg = (modelId: string, cls = '') => {
  const m = dealerModel(modelId);
  return `<img class="dl-img ${cls}" src="${m.image}" alt="${m.name}" loading="lazy" />`;
};

function emptyState(title: string, text: string): string {
  return `
    <div class="con-empty dl-empty">
      <svg class="con-empty-art" viewBox="0 0 80 80" aria-hidden="true">
        <path d="M40 10a30 30 0 1 0 30 30" fill="none" stroke="#3f7cf4" stroke-width="5" stroke-linecap="round"/>
        <path d="M44 18h26" stroke="#e5e7eb" stroke-width="4" stroke-linecap="round"/>
      </svg>
      <h2>${title}</h2>
      <p>${text}</p>
    </div>`;
}

/** Egen tegning: bil fra siden med fargeovergang (på kortet til bruktbilmarkedet). */
const marketArt = `<svg class="dl-market-art" viewBox="0 0 220 110" aria-hidden="true">
  <defs><linearGradient id="dlCarGrad" x1="0" x2="1"><stop offset="0" stop-color="#c9ccd1"/><stop offset=".55" stop-color="#7c8591"/><stop offset="1" stop-color="#3e4a5c"/></linearGradient></defs>
  <path d="M0 38 C40 30 70 28 92 30 C110 14 140 6 170 8 C190 9 205 22 214 40 C219 44 220 54 216 62 L208 70 L0 72 Z" fill="url(#dlCarGrad)"/>
  <path d="M106 32 C120 18 140 12 160 13 L168 34 Z" fill="#fff" opacity=".35"/>
  <circle cx="168" cy="72" r="26" fill="#3e4a5c"/><circle cx="168" cy="72" r="18" fill="#e9ecef"/><circle cx="168" cy="72" r="6" fill="#3e4a5c"/>
  <path d="M168 54v36M150 72h36M155 59l26 26M181 59l-26 26" stroke="#3e4a5c" stroke-width="2.5"/>
</svg>`;

// =========================================================================
// Forsiden
// =========================================================================
export function renderDealerDetail(b: Business, hero: string): string {
  const d = dealerOf(b);
  const used = inService(b).length;
  const usedPct = d.service > 0 ? Math.round((used / d.service) * 100) : 0;
  const seg = segmentById(d.segmentChange?.to ?? d.segment);
  const r = 44;
  const circ = 2 * Math.PI * r;
  return `
    ${hero}
    <div class="biz-income-card">
      <strong>${formatMoneyFull(showroomValue(b))}</strong>
      <span>Venter på salg</span>
    </div>
    <button class="dl-service-card" data-action="d-service" data-id="${b.id}">
      <span class="dl-tab">Bilverksted</span>
      ${pendingCars(b).length ? '<i class="dl-dot"></i>' : ''}
      <div class="dl-service-body">
        <div class="dl-ring">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="${r}" fill="none" stroke="#b3b9c2" stroke-opacity=".45" stroke-width="7"/>
            ${usedPct > 0 ? `<circle cx="50" cy="50" r="${r}" fill="none" stroke="#3f7cf4" stroke-width="7" stroke-linecap="round"
              stroke-dasharray="${(circ * usedPct) / 100} ${circ}" transform="rotate(-90 50 50)"/>` : ''}
          </svg>
          <div><strong>${usedPct} %</strong><span>I bruk</span></div>
        </div>
        <div class="dl-service-stats">
          <div>${icons.dotsCircle}<span>Venter</span><b>${pendingCars(b).length}</b></div>
          <div>${icons.wrench}<span>Under reparasjon</span><b>${repairingCars(b).length}</b></div>
          <div>${icons.frame}<span>Kapasitet</span><b>${d.service}</b></div>
        </div>
      </div>
    </button>
    <button class="dl-showroom-band" data-action="d-showroom" data-id="${b.id}">
      <h2>Bilutstilling</h2>
      <div class="dl-show-grid">
        <div class="dl-show-a"><b>${forSale(b).length}</b><span>Biler til salgs</span></div>
        <div class="dl-show-b"><b>${d.showroom}</b><span>Plasser i utstillingen</span></div>
      </div>
      <div class="dl-show-total">${icons.receipt}<div><b>${formatMoneyFull(showroomValue(b))}</b><span>Samlet verdi av bilene</span></div></div>
    </button>
    <div class="dl-tiles">
      <button class="dl-tile dl-market-tile" data-action="d-market" data-id="${b.id}">
        ${marketArt}
        <strong>Bruktbilmarked</strong>
      </button>
      <button class="dl-tile dl-spec-tile" data-action="d-spec" data-id="${b.id}">
        <strong>Spesialisering</strong>
        <div class="dl-seg-bar" style="--a:${seg.bar[0]};--b:${seg.bar[1]}"></div>
        <span class="dl-spec-name">${seg.name}</span>
        <small>${d.segmentChange ? `Byttes om ${formatDuration((d.segmentChange.end - Date.now()) / 1000, false)}` : 'Trykk for å bytte'}</small>
      </button>
    </div>
    <hr class="con-hr" />
    <h2 class="dl-h2">Forbedringer og investeringer</h2>
    <div class="dl-tiles">
      <button class="dl-tile dl-icon-tile" data-action="d-expand" data-id="${b.id}" data-kind="service">
        ${icons.tools}<strong>Bilverksted</strong>
        ${d.serviceExp ? `<small>${icons.clock} ${formatDuration((d.serviceExp.end - Date.now()) / 1000, false)}</small>` : ''}
      </button>
      <button class="dl-tile dl-icon-tile" data-action="d-expand" data-id="${b.id}" data-kind="showroom">
        ${icons.showroom}<strong>Bilutstilling</strong>
        ${d.showroomExp ? `<small>${icons.clock} ${formatDuration((d.showroomExp.end - Date.now()) / 1000, false)}</small>` : ''}
      </button>
    </div>
    <button class="dl-skills-btn" data-action="d-skills" data-id="${b.id}">${icons.skills}<strong>Ferdigheter</strong></button>
  `;
}

// =========================================================================
// Verkstedet og utstillingen
// =========================================================================
export function renderService(b: Business, filter: ServiceFilter): string {
  const now = Date.now();
  const all = inService(b);
  const list = all.filter((c) => filter === 'all' || (filter === 'progress' ? c.repair : !c.repair));
  const chip = (f: ServiceFilter, label: string) =>
    `<button class="dl-chip ${filter === f ? 'active' : ''}" data-action="d-filter" data-filter="${f}">${label}</button>`;
  const cards = list.map((c) => {
    const m = dealerModel(c.model);
    const bottom = c.repair
      ? `<b>${formatDuration((c.repair.end - now) / 1000, false)}</b><span>${icons.wrench} Under reparasjon</span>`
      : `<b>${formatMoneyFull(marketValue(c.model, c.damage))}</b><span>Markedsverdi</span>`;
    return `
      <button class="dl-card" data-action="d-car" data-id="${b.id}" data-car="${c.id}">
        <div class="dl-card-top">${carImg(c.model)}<span>${m.name}</span></div>
        <div class="dl-card-bottom ${c.repair ? 'busy' : ''}">${bottom}</div>
      </button>`;
  });
  return `
    <h1 class="dl-page-title">Bilverksted</h1>
    <div class="dl-chips">${chip('all', 'Alle')}${chip('progress', 'Under reparasjon')}${chip('pending', 'Venter')}</div>
    ${all.length === 0
      ? emptyState('Ingen biler', 'Kjøp en bil på bruktbilmarkedet for å begynne å pusse den opp')
      : list.length === 0
        ? emptyState('Ingen biler her', 'Ingen biler passer med valget')
        : `<div class="dl-grid">${cards.join('')}</div>`}`;
}

export function renderShowroom(b: Business): string {
  const list = forSale(b);
  const cards = list.map(
    (c) => `
      <button class="dl-card" data-action="d-car" data-id="${b.id}" data-car="${c.id}">
        <div class="dl-card-top">${carImg(c.model)}<span>${dealerModel(c.model).name}</span></div>
        <div class="dl-card-bottom sale"><b>${formatMoneyFull(c.forSale!.price)}</b><span>Pris</span></div>
      </button>`,
  );
  return `
    <h1 class="dl-page-title">Bilutstilling</h1>
    ${list.length ? `<div class="dl-grid">${cards.join('')}</div>` : emptyState('Ingen biler', 'Sett biler ut for salg')}`;
}

// =========================================================================
// Bruktbilmarkedet
// =========================================================================
export function renderMarket(state: GameState, b: Business): string {
  const cars = [...marketOf(b)].sort((x, y) => y.price - x.price);
  const avg = (m: MarketCar, key: 'lo' | 'hi') => m[key].reduce((s, v) => s + v, 0) / m[key].length;
  const rows = cars.map(
    (m) => `
      <button class="dl-market-row" data-action="d-mcar" data-id="${b.id}" data-car="${m.id}">
        <div class="dl-market-img">${carImg(m.model)}</div>
        <div class="dl-market-text">
          <strong>${dealerModel(m.model).name}</strong>
          <span>Bilens tilstand</span>
          ${rangeBar(avg(m, 'lo'), avg(m, 'hi'))}
          <b>${formatMoneyFull(m.price)}</b>
        </div>
      </button>`,
  );
  return `
    <h1 class="dl-page-title tight">Bruktbilmarked</h1>
    <p class="dl-sub">Saldo: <b>${formatBalance(state.balance)}</b></p>
    <p class="dl-refresh">${icons.clock} Nye biler om ${formatDuration(nextMarketRefresh() / 1000, false)}</p>
    <div class="dl-market">${rows.join('')}</div>`;
}

function partsGrid(cells: string[]): string {
  return `<div class="dl-parts">${PARTS.map(
    (p, i) => `<div class="dl-part">${PART_ICON[p.id]}<span>${p.name}</span>${cells[i]}</div>`,
  ).join('')}</div>`;
}

function carTop(state: GameState, modelId: string, price: number): string {
  return `
    <div class="dl-car-top">
      <p class="dl-car-balance">Saldo: <b>${formatBalance(state.balance)}</b></p>
      ${carImg(modelId, 'big')}
      <span class="dl-car-name">${dealerModel(modelId).name}</span>
      <strong class="dl-car-price">${formatMoneyFull(price)}</strong>
    </div>`;
}

export function renderMarketCar(state: GameState, b: Business, m: MarketCar): string {
  const d = dealerOf(b);
  const cost = diagnosticsCost(m);
  const full = inService(b).length >= d.service;
  return `
    ${carTop(state, m.model, m.price)}
    ${partsGrid(PARTS.map((_, i) => rangeBar(m.lo[i], m.hi[i])))}
    <p class="dl-note">Strekene viser grensene der den ekte tilstanden til hver del ligger. ${
      m.diag ? `Diagnosen er utført (treffsikkerhet ${Math.round(DIAG_ACCURACY * 100)} %).` : 'Hvor treffsikkert anslaget er, kommer an på ferdighetene dine.'
    }</p>
    ${m.diag ? '' : `
      <div class="dl-diag">
        <div class="dl-diag-head">${icons.diagnostics}<div><h2>Diagnose</h2><p>Bestill en spesialist som vurderer tilstanden til bilen. Treffsikkerhet: ${Math.round(DIAG_ACCURACY * 100)} %</p></div></div>
        <button class="dl-diag-btn ${state.balance >= cost ? '' : 'poor'}" data-action="d-diag" data-id="${b.id}" data-car="${m.id}">${formatMoneyFull(cost)}</button>
      </div>`}
    <button class="dl-btn ${state.balance >= m.price && !full ? '' : 'poor'}" data-action="d-buy" data-id="${b.id}" data-car="${m.id}">Kjøp</button>
    ${full ? '<p class="dl-warn">Verkstedet er fullt – sett biler ut for salg eller utvid verkstedet.</p>' : ''}
    <p class="dl-hint">Tilstanden du ser her er bare et anslag. Prisen bygger på anslaget, så en bil kan være bedre – eller dårligere – enn den ser ut.</p>`;
}

// =========================================================================
// En bil du eier
// =========================================================================
export function renderOwnedCar(state: GameState, b: Business, c: DealerCar, selected: PartId[]): string {
  const now = Date.now();
  const value = c.forSale ? c.forSale.price : marketValue(c.model, c.damage);
  const net = netIncome(c);
  const parts = partsGrid(PARTS.map((_, i) => exactBar(partCondition(c.damage, i))));

  let repair = '';
  if (!c.forSale) {
    const sel = selected.filter((id) => c.damage[PARTS.findIndex((p) => p.id === id)] > 0);
    const tiles = PARTS.map((p, i) => {
      const done = c.damage[i] === 0;
      const inRepair = c.repair?.parts.includes(p.id);
      const on = sel.includes(p.id);
      const cls = done ? 'done' : inRepair ? 'working' : on ? 'on' : '';
      const disabled = done || !!c.repair;
      return `<button class="dl-rep ${cls}" ${disabled ? 'disabled' : ''} data-action="d-part" data-part="${p.id}" aria-label="${p.name}" title="${p.name}">${PART_ICON[p.id]}</button>`;
    }).join('');
    let body: string;
    if (c.repair) {
      const total = c.repair.end - c.repair.start;
      const left = Math.max(0, c.repair.end - now);
      body = `
        <div class="dl-repairing">
          <span>Reparasjon pågår: ${c.repair.parts.map((id) => PARTS.find((p) => p.id === id)!.name.toLowerCase()).join(', ')}</span>
          <strong>${formatDuration(left / 1000)}</strong>
          <div class="dl-progress"><span style="width:${pct(1 - left / Math.max(1, total))}"></span></div>
        </div>`;
    } else {
      const cost = repairCost(c, sel);
      const min = repairMinutes(c, sel);
      body = `
        <div class="dl-rep-info">
          <span>Kostnad:</span><b>${formatMoneyFull(cost)}</b>
          <span>Varighet:</span><b>${Math.floor(min / 60)} t. ${min % 60} min.</b>
        </div>
        <button class="dl-btn ${sel.length ? (state.balance >= cost ? '' : 'poor') : ''}" ${sel.length ? '' : 'disabled'} data-action="d-repair" data-id="${b.id}" data-car="${c.id}">Start reparasjon</button>`;
    }
    const allDone = c.damage.every((x) => x === 0);
    repair = `
      <h2 class="dl-dark-h2">Reparasjon</h2>
      <div class="dl-rep-row">${tiles}</div>
      ${allDone ? '<p class="dl-all-done">' + icons.checkCircle + ' Bilen er helt reparert</p>' : body}`;
  }

  const showroomFull = forSale(b).length >= dealerOf(b).showroom;
  const sellBtn = c.forSale
    ? `<p class="dl-waiting">${icons.clockDashed} Står i utstillingen og venter på en kjøper</p>`
    : `<button class="dl-btn ${c.repair ? '' : showroomFull ? 'poor' : ''}" ${c.repair ? 'disabled' : ''} data-action="d-sell" data-id="${b.id}" data-car="${c.id}">Sett ut for salg</button>
       ${c.repair ? '<p class="dl-hint">Bilen kan ikke selges mens den repareres.</p>' : showroomFull ? '<p class="dl-warn">Utstillingen er full – vent til en bil er solgt eller utvid utstillingen.</p>' : ''}`;

  return `
    ${carTop(state, c.model, value)}
    ${parts}
    ${repair}
    <h2 class="dl-dark-h2">Statistikk</h2>
    <div class="dl-stats">
      <span>Innkjøpspris:</span><b>${formatMoneyFull(c.paid)}</b>
      <span>Investert i reparasjon:</span><b>${formatMoneyFull(c.repaired)}</b>
      <span>${c.forSale ? 'Salgspris' : 'Markedsverdi'}:</span><b>${formatMoneyFull(value)}</b>
      <i></i>
      <span>Netto inntekt:</span><b class="${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '▲' : '▼'} ${net >= 0 ? '' : '- '}${formatMoneyFull(Math.abs(net))}</b>
    </div>
    ${sellBtn}`;
}

/** Hvor mye én del koster å reparere (vises i tittelen på knappen). */
export const partCostLabel = (c: DealerCar, i: number) => formatMoneyFull(partRepairCost(c.model, c.damage, i));

// =========================================================================
// Spesialisering
// =========================================================================
export function renderSpec(b: Business, pick: SegmentId | null): string {
  const d = dealerOf(b);
  const card = (id: SegmentId, active: boolean, extra = '') => {
    const s = segmentById(id);
    return `
      <button class="dl-seg ${active ? 'active' : ''}" data-action="d-spec-pick" data-seg="${id}" ${d.segmentChange ? 'disabled' : ''}>
        <h2>${s.name}</h2>
        <div class="dl-seg-body">
          <p>${s.examples}</p>
          <div class="dl-seg-price">${icons.bill}<div><b>${formatMoneyFull(averageValue(id))}</b><span>Gjennomsnittlig bilpris i segmentet</span></div></div>
          <div class="dl-seg-bar" style="--a:${s.bar[0]};--b:${s.bar[1]}"></div>
          ${extra}
        </div>
      </button>`;
  };
  if (d.segmentChange) {
    const left = Math.max(0, d.segmentChange.end - Date.now());
    return `
      <h1 class="dl-page-title">Spesialisering</h1>
      ${card(d.segmentChange.to, false, `
        <strong class="dl-seg-time">${formatDuration(left / 1000)}</strong>
        <span class="dl-seg-left">Gjenstående tid</span>
        <div class="dl-progress light"><span style="width:${pct(1 - left / SEGMENT_CHANGE_MS)}"></span></div>`)}`;
  }
  const chosen = pick ?? d.segment;
  return `
    <h1 class="dl-page-title">Spesialisering</h1>
    <p class="dl-sub">Bestemmer hvilke biler som er i bruktbilmarkedet. Å bytte tar ${SEGMENT_CHANGE_MS / 60000} minutter.</p>
    <div class="dl-segs">${SEGMENTS.map((s) => card(s.id, s.id === chosen)).join('')}</div>
    <button class="dl-change ${chosen !== d.segment ? 'ready' : ''}" ${chosen !== d.segment ? '' : 'disabled'} data-action="d-spec-change" data-id="${b.id}" data-seg="${chosen}">Bytt spesialisering</button>`;
}

// =========================================================================
// Utvidelse av verkstedet / utstillingen
// =========================================================================
export function renderExpand(state: GameState, b: Business, kind: 'service' | 'showroom'): string {
  const d = dealerOf(b);
  const exp = kind === 'service' ? d.serviceExp : d.showroomExp;
  const places = kind === 'service' ? d.service : d.showroom;
  const icon = kind === 'service' ? icons.wrench : icons.dealer;
  const title = kind === 'service' ? 'Bilverksted' : 'Bilutstilling';
  let body: string;
  if (exp) {
    const opt = EXPANSIONS[kind].find((o) => o.places === exp.places)!;
    const left = Math.max(0, exp.end - Date.now());
    body = `
      <div class="dl-exp-card busy">
        <span class="dl-exp-icons n1">${icon}</span>
        <div>
          <strong>Utvidelse pågår</strong>
          <span>+${exp.places} plasser</span>
          <b>${formatDuration(left / 1000)}</b>
          <div class="dl-progress light"><span style="width:${pct(1 - left / (opt.seconds * 1000))}"></span></div>
        </div>
      </div>`;
  } else {
    body = EXPANSIONS[kind]
      .map(
        (o, i) => `
        <button class="dl-exp-card ${state.balance >= o.price ? '' : 'poor'}" data-action="d-expand-buy" data-id="${b.id}" data-kind="${kind}" data-index="${i}">
          <span class="dl-exp-icons n${i + 1}">${icon.repeat(i + 1)}</span>
          <div>
            <strong>${o.name}</strong>
            <span>${o.places} plasser · ${formatDuration(o.seconds, false)}</span>
            <b>${formatMoneyWhole(o.price)}</b>
          </div>
        </button>`,
      )
      .join('');
  }
  return `
    <div class="dl-exp-hero ${kind}">
      <h1>${title}</h1>
      <svg viewBox="0 0 360 120" aria-hidden="true" class="dl-exp-art">${kind === 'service' ? serviceArt : showroomArt}</svg>
    </div>
    <p class="dl-exp-now">Nå: <b>${formatInt(places)} plasser</b></p>
    <div class="dl-exp-list">${body}</div>
    <p class="dl-exp-balance">Saldo: <b>${formatBalance(state.balance)}</b></p>`;
}

/** Egne tegninger av et verksted (løfter med bil) og en bilutstilling (glassvegg). */
const serviceArt = `
  <rect x="0" y="0" width="360" height="120" fill="none"/>
  <path d="M20 112h320" stroke="#fff" stroke-opacity=".25" stroke-width="2"/>
  <rect x="60" y="40" width="8" height="72" fill="#f2c14e"/><rect x="292" y="40" width="8" height="72" fill="#f2c14e"/>
  <rect x="60" y="62" width="240" height="6" fill="#f2c14e" opacity=".8"/>
  <path d="M95 60c4-10 14-16 30-18l30-12c22-6 52-6 72 2l22 12c14 2 22 8 22 16Z" fill="#9aa6b8"/>
  <path d="M160 34c18-4 40-4 58 2l14 10h-84Z" fill="#cfe3f2" opacity=".7"/>
  <circle cx="130" cy="60" r="10" fill="#2a2f38"/><circle cx="250" cy="60" r="10" fill="#2a2f38"/>
  <path d="M30 20h60M270 20h60" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>`;
const showroomArt = `
  <path d="M0 112h360" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>
  <path d="M10 10h340M60 10v100M120 10v100M180 10v100M240 10v100M300 10v100" stroke="#fff" stroke-opacity=".45" stroke-width="2"/>
  <path d="M40 104c3-9 12-14 26-16l26-10c20-5 46-5 64 2l20 10c12 2 20 7 20 14Z" fill="#e0742f"/>
  <circle cx="72" cy="104" r="8" fill="#2a2f38"/><circle cx="172" cy="104" r="8" fill="#2a2f38"/>
  <path d="M200 104c3-9 12-14 26-16l26-10c20-5 46-5 64 2l20 10c12 2 20 7 20 14Z" fill="#2f3440"/>
  <circle cx="232" cy="104" r="8" fill="#15181d"/><circle cx="332" cy="104" r="8" fill="#15181d"/>`;

// =========================================================================
// Ferdigheter
// =========================================================================
export function renderSkills(b: Business): string {
  const d = dealerOf(b);
  return `
    <h1 class="dl-page-title">Ferdigheter</h1>
    <p class="dl-sub">Jo flere reparasjoner av en del, jo bedre blir du til å se tilstanden på bilene i markedet.</p>
    <div class="dl-skills">${PARTS.map((p) => {
      const next = nextLevelAt(d, p.id);
      return `
        <div class="dl-skill">
          <div class="dl-skill-head">${PART_ICON[p.id]}<h2>${p.name}</h2></div>
          <div class="dl-skill-row">${icons.wrench}<div><b>${formatInt(d.skills[p.id] ?? 0)}</b><span>Antall reparasjoner utført</span></div></div>
          <div class="dl-skill-row">${icons.gauge}<div><b>${Math.round(skillAccuracy(d, p.id) * 100)} %</b><span>Treffsikkerhet på tilstanden</span></div></div>
          <div class="dl-skill-row">${icons.levels}<div><b>${next === null ? 'Høyeste nivå' : `${next} reparasjoner`}</b><span>Neste nivå</span></div></div>
        </div>`;
    }).join('')}</div>`;
}

/** Brukes av markedet: tilstanden man ser (for testing/visning). */
export const shownCondition = apparentCondition;
