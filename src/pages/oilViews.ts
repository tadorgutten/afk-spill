import type { Business } from '../game/business';
import {
  MAX_LEVEL,
  PLATFORMS,
  PRICE_STEP_MS,
  UPGRADES,
  UPGRADE_BONUS,
  capacity,
  capacityOf,
  isFull,
  nextPlatform,
  oilChange,
  oilIncome,
  oilOf,
  oilPrice,
  ownedPlatform,
  platformById,
  platformImage,
  platformRate,
  pumpRate,
  storageHours,
  upgradeCost,
  type OwnedPlatform,
  type PlatformDef,
} from '../game/oil';
import type { GameState } from '../game/state';
import { stockChart } from '../ui/chart';
import { formatDuration, formatInt, formatMoney, formatMoneyFull, formatMoneyWhole, formatPrice, formatSignedPercent, priceNumber } from '../ui/format';
import { icons } from '../ui/icons';
import { skipBtn } from '../game/skip';

/*
 * Sidene til oljeselskapet (enkelt og ryddig, i samme stil som flyselskapet):
 *   detail – forsiden: plattformen i drift, lageret (selg / bygg ut), oljeprisen og alle plattformene
 *   oPlat  – én plattform: olje per time, ta den i bruk, oppgraderinger
 */

// --- Små hjelpere -------------------------------------------------------------------------------
/** 190 000 fat / 1,5 mill. fat */
export function barrels(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} mill. fat`;
  return `${formatInt(n)} fat`;
}
const time = (ms: number) => formatDuration(Math.max(0, ms) / 1000, false);
const photo = (id: string) => `<img src="${platformImage(id)}" alt="" onerror="this.style.display='none'" />`;
const bar = (fill: number, cls = '') =>
  `<div class="oil-bar ${cls}"><span style="width:${Math.max(0, Math.min(100, fill * 100))}%"></span></div>`;
const balanceLine = (state: GameState) => `<p class="oil-sub">Saldo: <b>${formatMoneyFull(state.balance)}</b></p>`;
const change = (v: number) => `<b class="${v >= 0 ? 'oil-up' : 'oil-down'}">${formatSignedPercent(v * 100)}</b>`;

// =========================================================================
// Forsiden
// =========================================================================
export function renderOilDetail(state: GameState, b: Business, hero: string, confirm: boolean): string {
  const s = oilOf(b);
  const now = Date.now();
  const active = ownedPlatform(s, s.active) ?? s.owned[0];
  const def = platformById(active.id);
  const full = isFull(s);
  const cap = capacityOf(s);
  const price = oilPrice(s);
  const rate = pumpRate(s);

  // --- Lager ---
  const sell = (share: number, label: string) =>
    `<button class="oil-sell" data-action="o-sell" data-id="${b.id}" data-share="${share}" ${s.stock > 0 ? '' : 'disabled'}>
      <strong>${label}</strong><span>${formatMoney(s.stock * share * price)}</span>
    </button>`;
  const storageUpgrade =
    s.levelDoneAt !== null
      ? `<div class="oil-upgrading">${icons.hourglass}<div><strong>Lageret bygges ut</strong><span>Plass til ${barrels(capacity(s.level + 1))} om ${time(s.levelDoneAt - now)}</span></div>${skipBtn('oilstore', b.id, '', true)}</div>`
      : s.level >= MAX_LEVEL
        ? `<p class="oil-muted center">Lageret er bygd ut så mye det går.</p>`
        : `<button class="oil-soft-btn" data-action="o-storage" data-id="${b.id}">
            ${icons.arrowUpBox}<span>Bygg ut til ${barrels(capacity(s.level + 1))}<small>Gratis · tar ${storageHours(s.level)} t</small></span>
          </button>`;

  // --- Plattformene ---
  const next = nextPlatform(s);
  const rows = PLATFORMS.map((p) => platformRow(state, b, p, next, confirm, now)).join('');

  return `
    ${hero}
    <div class="biz-income-card">
      <strong>${formatMoneyFull(oilIncome(b))}</strong>
      <span>Verdi av olje per time</span>
    </div>
    ${full ? `<div class="oil-alert">${icons.warehouse}<div><strong>Lageret er fullt</strong><span>Plattformen står stille. Selg olje eller bygg ut lageret.</span></div></div>` : ''}

    <button class="oil-hero-card" data-action="o-plat" data-id="${b.id}" data-plat="${def.id}">
      ${photo(def.id)}
      <div class="oil-hero-shade"></div>
      <span class="oil-live ${full ? 'off' : ''}"><i></i>${full ? 'Står stille' : 'I drift'}</span>
      <div class="oil-hero-text">
        <strong>${def.name}</strong>
        <span>${def.place}, ${def.country}</span>
      </div>
      <div class="oil-hero-stats">
        <div>${icons.drop}<b>${barrels(rate)}</b><small>per time</small></div>
        <div>${icons.arrowUpBox}<b>${active.ups.length} av ${UPGRADES.length}</b><small>oppgraderinger</small></div>
      </div>
    </button>

    <h2 class="oil-head">${icons.warehouse}Lager</h2>
    <div class="oil-card">
      <div class="oil-store">
        <div><strong>${barrels(s.stock)}</strong><span>av ${barrels(cap)}</span></div>
        <span class="oil-level">Nivå ${s.level + 1}/${MAX_LEVEL + 1}</span>
      </div>
      ${bar(s.stock / cap, full ? 'full' : '')}
      <p class="oil-muted">${full ? '<b class="oil-down">Fullt – plattformen pumper ikke mer.</b>' : rate > 0 ? `Fullt om ${time(((cap - s.stock) / rate) * 3_600_000)}` : ''}</p>
      <div class="oil-worth"><span>Verdi nå</span><b>${formatMoneyFull(s.stock * price)}</b></div>
      <div class="oil-sell-row">${sell(0.25, 'Selg 25 %')}${sell(0.5, 'Selg 50 %')}${sell(1, 'Selg alt')}</div>
      ${storageUpgrade}
    </div>

    <h2 class="oil-head">${icons.drop}Oljepris</h2>
    <div class="oil-card">
      <div class="oil-price">
        <div><strong>${formatPrice(price)}</strong><span>per fat</span></div>
        <div class="oil-price-change">${change(oilChange(s))}<span>siste døgn</span></div>
      </div>
      ${stockChart(s.price.hist, s.priceAt, price, priceNumber, PRICE_STEP_MS)}
      <div class="oil-minmax">
        <div><span>Høyest</span><b>${formatPrice(Math.max(...s.price.hist))}</b></div>
        <div><span>Normalt</span><b>${formatPrice(8)}</b></div>
        <div><span>Lavest</span><b>${formatPrice(Math.min(...s.price.hist))}</b></div>
      </div>
    </div>

    <h2 class="oil-head">${icons.rig}Plattformer</h2>
    <p class="oil-muted center">${s.owned.length} av ${PLATFORMS.length} · bare én kan pumpe om gangen</p>
    <div class="oil-list">${rows}</div>
    ${balanceLine(state)}

    <div class="oil-help">
      <h3>Slik fungerer oljeselskapet</h3>
      <p>Plattformen du har valgt, pumper olje hele tiden, også når appen er lukket. Oljen havner på lageret, og du selger selv når prisen er god.</p>
      <p>Er lageret fullt, står plattformen stille. Å bygge ut lageret er gratis, men tar tid.</p>
      <p>Nye plattformer pumper mer, men tar lengre tid å bygge. Mens en bygges, pumper den gamle som før.</p>
    </div>`;
}

/** Én rad i lista over plattformer. */
function platformRow(state: GameState, b: Business, p: PlatformDef, next: PlatformDef | null, confirm: boolean, now: number): string {
  const s = oilOf(b);
  const owned = ownedPlatform(s, p.id);
  const head = (extra: string) => `
    <div class="oil-row-photo">${photo(p.id)}</div>
    <div class="oil-row-text"><strong>${p.name}</strong><span>${p.place}, ${p.country}</span>${extra}</div>`;

  // Eier den
  if (owned) {
    const isActive = s.active === p.id;
    return `
      <div class="oil-row owned ${isActive ? 'active' : ''}">
        <button class="oil-row-main" data-action="o-plat" data-id="${b.id}" data-plat="${p.id}">
          ${head(`<small>${barrels(platformRate(owned))} / t${owned.ups.length ? ` · ${owned.ups.length} oppgr.` : ''}</small>`)}
        </button>
        ${isActive ? `<span class="oil-chip">I drift</span>` : `<button class="oil-pill-btn small" data-action="o-use" data-id="${b.id}" data-plat="${p.id}">Bruk</button>`}
      </div>`;
  }

  // Bygges: et større kort med bilde, nedtelling og fremdrift
  if (s.building?.id === p.id) {
    const total = p.buildHours * 3_600_000;
    const left = Math.max(0, s.building.doneAt - now);
    const done = Math.min(1, 1 - left / total);
    return `
      <div class="oil-build">
        <div class="oil-build-photo">${photo(p.id)}<span class="oil-build-tag">${icons.hourglass}Bygges</span></div>
        <div class="oil-build-body">
          <div class="oil-build-head"><div><strong>${p.name}</strong><span>${p.place}, ${p.country}</span></div><b>${Math.floor(done * 100)} %</b></div>
          ${bar(done, 'build')}
          <div class="oil-build-stats">
            <div>${icons.clock}<span><b>${formatDuration(left / 1000)}</b><small>Tid igjen</small></span></div>
            <div>${icons.drop}<span><b>${barrels(p.rate)} / t</b><small>Når den er ferdig</small></span></div>
          </div>
          <p class="oil-muted">Plattformen du har nå, pumper som før mens denne bygges. Den nye tas i bruk med en gang den er ferdig.</p>
          ${skipBtn('oilbuild', b.id)}
        </div>
      </div>`;
  }

  // Neste som kan kjøpes
  if (next?.id === p.id) {
    const busy = s.building !== null;
    const label = busy ? 'Vent' : confirm ? 'Trykk igjen' : 'Kjøp';
    return `
      <div class="oil-row next">
        <div class="oil-row-main">${head(`<small>${barrels(p.rate)} / t · bygges på ${p.buildHours} t</small>`)}</div>
        <div class="oil-buy">
          <b>${formatMoneyWhole(p.price)}</b>
          <button class="oil-pill-btn small ${state.balance >= p.price && !busy ? '' : 'off'} ${confirm ? 'confirm' : ''}" data-action="o-buy" data-id="${b.id}">${label}</button>
        </div>
      </div>`;
  }

  // Senere (låst til de før er kjøpt)
  return `
    <div class="oil-row locked">
      <div class="oil-row-main">${head(`<small>${barrels(p.rate)} / t · ${formatMoneyWhole(p.price)}</small>`)}</div>
      <span class="oil-lock">${icons.lock}</span>
    </div>`;
}

// =========================================================================
// Én plattform
// =========================================================================
export function renderPlatform(state: GameState, b: Business, p: OwnedPlatform, confirm: string | null): string {
  const s = oilOf(b);
  const def = platformById(p.id);
  const isActive = s.active === p.id;
  const cost = upgradeCost(p.id, p.ups.length);

  const ups = UPGRADES.map((u) => {
    const has = p.ups.includes(u.id);
    const sure = confirm === `up:${u.id}`;
    return `
      <div class="oil-up-card ${has ? 'done' : ''}">
        <span class="oil-up-icon">${icons[u.icon]}</span>
        <div class="oil-up-text"><strong>${u.name}</strong><span>${u.text}</span><b class="oil-up">+${Math.round(UPGRADE_BONUS * 100)} % olje</b></div>
        ${
          has
            ? `<span class="oil-done">${icons.check}</span>`
            : `<div class="oil-buy col">
                <b>${formatMoneyWhole(cost)}</b>
                <button class="oil-pill-btn small ${state.balance >= cost ? '' : 'off'} ${sure ? 'confirm' : ''}" data-action="o-up" data-id="${b.id}" data-plat="${p.id}" data-up="${u.id}">${sure ? 'Trykk igjen' : 'Kjøp'}</button>
              </div>`
        }
      </div>`;
  }).join('');

  return `
    <div class="oil-banner">
      ${photo(def.id)}
      <div class="oil-banner-text"><h1>${def.name}</h1><span>${def.place}, ${def.country}</span></div>
    </div>
    <div class="biz-income-card oil-income">
      <strong>${barrels(platformRate(p))}</strong>
      <span>Olje per time</span>
    </div>
    ${
      isActive
        ? `<p class="oil-active-note">${icons.checkCircle}Denne plattformen pumper nå</p>`
        : `<button class="oil-btn" data-action="o-use" data-id="${b.id}" data-plat="${p.id}">Bruk denne plattformen</button>`
    }

    <div class="oil-stats">
      <div><span>Uten oppgraderinger</span><b>${barrels(def.rate)} / t</b></div>
      <div><span>Verdi per time nå</span><b>${formatMoney(platformRate(p) * oilPrice(s))}</b></div>
    </div>

    <h2 class="oil-head">${icons.arrowUpBox}Oppgraderinger</h2>
    <p class="oil-muted center">${p.ups.length} av ${UPGRADES.length} kjøpt · gjelder bare denne plattformen</p>
    <div class="oil-list">${ups}</div>
    ${balanceLine(state)}`;
}
