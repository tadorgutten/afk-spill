import type { Business } from '../game/business';
import {
  MAX_STORAGE_LEVEL,
  MINERALS,
  MINES,
  PRICE_STEP_MS,
  TOOLS,
  capacity,
  capacityOf,
  digRate,
  findsPerHour,
  hoursLeft,
  isFull,
  isOpen,
  mineById,
  mineValuePerHour,
  mineralById,
  miningIncome,
  miningOf,
  ownedMine,
  priceChange,
  priceNow,
  stockValue,
  storageCost,
  toolById,
  toolPrice,
  valuePerTonn,
  yieldPerTonn,
  type OwnedMine,
} from '../game/mine';
import type { MineralId } from '../game/mineData';
import type { GameState } from '../game/state';
import { stockChart } from '../ui/chart';
import { formatDuration, formatInt, formatMoney, formatMoneyFull, formatMoneyWhole, formatPrice, formatSignedPercent, priceNumber } from '../ui/format';
import { icons } from '../ui/icons';

/*
 * Sidene til gruveselskapet:
 *   detail – oversikt: verdi per time, mineralene (én knapp hver), mine gruver
 *   mMine  – én gruve: funn, fangst og graveverktøyet
 *   mTools – kjøp nytt graveverktøy til en gruve
 *   mMines – alle gruvene (ingen er låst – dyrere gruver har mer verdifulle funn)
 *   mRes   – ett mineral: pris og graf, lageret, selg og bygg ut lageret
 */

// --- Små hjelpere -------------------------------------------------------------------------------
/** Vekt: 3,2 kg / 850 kg / 12,5 t / 1 250 t */
export function weight(kg: number): string {
  if (kg >= 10_000) return `${formatInt(kg / 1000)} t`;
  if (kg >= 1000) return `${(kg / 1000).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} t`;
  if (kg >= 10) return `${formatInt(kg)} kg`;
  return `${kg.toLocaleString('nb-NO', { maximumFractionDigits: 2 })} kg`;
}
const tonn = (t: number) => `${formatInt(t)} t`;
const perHour = (v: number) => `${formatMoney(v)} / t`;
const pct = (v: number) => `${Math.round(v * 100)} %`;
const change = (v: number) => `<b class="${v >= 0 ? 'mn-up' : 'mn-down'}">${formatSignedPercent(v * 100)}</b>`;

/** Rundt ikon for et mineral i mineralets farge. */
export const mineralIcon = (id: MineralId, big = false) => {
  const m = mineralById(id);
  return `<span class="mn-min-icon ${big ? 'big' : ''}" style="--min:${m.color}">${m.gem ? icons.gem : icons.ore}</span>`;
};

const photo = (id: string) => `<img src="mines/${id}.jpg" alt="" loading="lazy" />`;
const bar = (fill: number, warn = false) =>
  `<div class="mn-cond"><span style="width:${Math.max(0, Math.min(100, fill * 100))}%" class="${warn ? 'low' : ''}"></span></div>`;

/** Hva som er galt med en gruve akkurat nå (eller null). */
function mineProblem(m: OwnedMine): string | null {
  if (!isOpen(m)) return null;
  if (!m.tool) return 'Mangler graveverktøy';
  if (m.wear <= 0) return 'Verktøyet er slitt ut';
  return null;
}

// =========================================================================
// Forsiden
// =========================================================================
export function renderMineDetail(state: GameState, b: Business, hero: string): string {
  const s = miningOf(b);
  const stopped = s.mines.filter((m) => mineProblem(m)).length;
  const full = MINERALS.filter((m) => isFull(s, m.id));

  const minerals = MINERALS.map((m) => {
    const cap = capacityOf(s, m.id);
    const fill = s.stock[m.id] / cap;
    return `
      <button class="mn-res" data-action="m-res" data-id="${b.id}" data-res="${m.id}">
        ${mineralIcon(m.id)}
        <div class="mn-res-text">
          <strong>${m.name}</strong>
          <span>${weight(s.stock[m.id])} på lager</span>
        </div>
        <div class="mn-res-price">
          <b>${formatPrice(priceNow(s, m.id))}</b>
          ${change(priceChange(s, m.id))}
        </div>
        ${bar(fill, fill >= 0.9999)}
      </button>`;
  }).join('');

  const cards = s.mines
    .map((m) => {
      const def = mineById(m.id);
      const problem = mineProblem(m);
      const tool = m.tool ? toolById(m.tool) : null;
      return `
      <button class="mn-card" data-action="m-mine" data-id="${b.id}" data-mine="${m.id}">
        <div class="mn-card-photo">${photo(m.id)}<div><strong>${def.name}</strong><span>${def.place}, ${def.country}</span></div></div>
        <div class="mn-card-body">
          ${!isOpen(m) ? `<span class="mn-job-chip">${icons.clock}Gjøres klar · ${formatDuration((m.openAt! - Date.now()) / 1000)}</span>` : ''}
          ${problem ? `<span class="mn-warn-chip">${icons.info}${problem}</span>` : ''}
          <div class="mn-card-stats">
            <div><b>${tool ? tool.name : '–'}</b><span>Verktøy</span></div>
            <div><b>${tonn(digRate(m))}</b><span>Per time</span></div>
            <div><b>${formatMoney(mineValuePerHour(s, m))}</b><span>Verdi / t</span></div>
          </div>
          ${tool ? bar(m.wear / (tool.rate * tool.lifeHours), hoursLeft(m) < 6) : ''}
          ${tool ? `<small class="mn-cond-label">Verktøyet varer ca. ${formatDuration(hoursLeft(m) * 3600, false)} til</small>` : ''}
        </div>
      </button>`;
    })
    .join('');

  return `
    ${hero}
    <div class="biz-income-card">
      <strong>${formatMoneyFull(miningIncome(b))}</strong>
      <span>Verdi av funn per time</span>
    </div>
    <div class="mn-summary">
      <div>${icons.pickaxe}<b>${s.mines.length} / ${MINES.length}</b><span>Gruver</span></div>
      <div>${icons.warehouse}<b>${formatMoney(stockValue(s))}</b><span>På lager</span></div>
      <div>${icons.coin}<b>${formatMoney(s.sold)}</b><span>Solgt for</span></div>
    </div>
    ${stopped ? `<div class="mn-warn">${icons.info}<div><strong>${stopped === 1 ? 'En gruve står stille' : `${stopped} gruver står stille`}</strong><span>Kjøp nytt graveverktøy så de graver igjen.</span></div></div>` : ''}
    ${full.length ? `<div class="mn-warn">${icons.warehouse}<div><strong>Fullt lager: ${full.map((m) => m.name.toLowerCase()).join(', ')}</strong><span>Nye funn går tapt. Selg eller bygg ut lageret.</span></div></div>` : ''}

    <h2 class="mn-title">Mineraler</h2>
    <div class="mn-res-list">${minerals}</div>

    <h2 class="mn-title">Mine gruver</h2>
    <div class="mn-cards">${cards}</div>
    <button class="mn-btn" data-action="m-mines" data-id="${b.id}">Se alle gruver</button>
    <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>
    <div class="mn-help">
      <h3>Slik fungerer gruvene</h3>
      <p>Gruvene graver hele tiden, også når appen er lukket. Det de finner, havner på lageret – og du selger selv når prisen er god. Prisene går opp og ned som aksjer.</p>
      <p>Graveverktøyet slites ut etter en stund, og da stopper gruva til du kjøper et nytt. Bedre verktøy graver mer per time. Er et lager fullt, går nye funn av det mineralet tapt.</p>
    </div>`;
}

// =========================================================================
// Én gruve
// =========================================================================
export function renderMine(state: GameState, b: Business, m: OwnedMine): string {
  const s = miningOf(b);
  const def = mineById(m.id);
  const tool = m.tool ? toolById(m.tool) : null;
  const problem = mineProblem(m);
  const perTool = tool ? m.wear / (tool.rate * tool.lifeHours) : 0;

  const finds = findsPerHour(m)
    .map(
      ([id, kg]) => `
      <button class="mn-row mn-row-btn" data-action="m-res" data-id="${b.id}" data-res="${id}">
        ${mineralIcon(id)}
        <div class="mn-row-text"><strong>${mineralById(id).name}</strong><span>${pct(def.finds[id]!)} av funnene · ${weight(kg)} per time</span></div>
        ${icons.chevronRight}
      </button>`,
    )
    .join('');

  return `
    <div class="mn-banner">
      ${photo(m.id)}
      <div class="mn-banner-text"><h1>${def.name}</h1><span>${def.place}, ${def.country}</span></div>
    </div>
    <div class="biz-income-card mn-income">
      <strong>${formatMoneyFull(mineValuePerHour(s, m))}</strong>
      <span>Verdi av funn per time</span>
    </div>
    ${!isOpen(m) ? `<div class="mn-job">${icons.clock}<div><strong>Gruva gjøres klar</strong><span>Ferdig om ${formatDuration((m.openAt! - Date.now()) / 1000)}</span></div></div>` : ''}
    ${problem ? `<div class="mn-warn">${icons.info}<div><strong>${problem}</strong><span>Gruva graver ikke før den får et nytt graveverktøy.</span></div></div>` : ''}

    <div class="mn-stats">
      <div><span>Fangst</span><b>${weight(yieldPerTonn(def))} per tonn</b></div>
      <div><span>Graver</span><b>${tonn(digRate(m))} per time</b></div>
      <div><span>Verdi per tonn</span><b>${formatMoneyWhole(valuePerTonn(def))}</b></div>
      <div><span>Gravd totalt</span><b>${tonn(m.dug)}</b></div>
    </div>

    <h2 class="mn-title">Funn</h2>
    <div class="mn-box">${finds}</div>

    <h2 class="mn-title">Graveverktøy</h2>
    <div class="mn-box">
      ${
        tool
          ? `<div class="mn-row">
              <span class="mn-row-icon">${icons.pickaxe}</span>
              <div class="mn-row-text"><strong>${tool.name}</strong><span>${tonn(tool.rate)} per time</span></div>
            </div>
            ${bar(perTool, hoursLeft(m) < 6)}
            <p class="mn-muted small">${m.wear > 0 ? `${tonn(m.wear)} igjen – varer ca. ${formatDuration(hoursLeft(m) * 3600, false)} til` : 'Slitt ut'}</p>`
          : '<p class="mn-muted">Gruva har ikke noe graveverktøy ennå.</p>'
      }
      <button class="mn-btn" data-action="m-tools" data-id="${b.id}" data-mine="${m.id}">Kjøp nytt graveverktøy</button>
    </div>
    <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>`;
}

// =========================================================================
// Graveverktøy
// =========================================================================
export function renderTools(state: GameState, b: Business, m: OwnedMine, confirm: string | null): string {
  const def = mineById(m.id);
  const rows = TOOLS.map((t) => {
    const price = toolPrice(m.id, t.id);
    const key = `tool:${t.id}`;
    const sure = confirm === key;
    const current = m.tool === t.id && m.wear > 0;
    return `
      <div class="mn-tool ${current ? 'current' : ''}">
        <span class="mn-row-icon">${icons.pickaxe}</span>
        <div class="mn-row-text">
          <strong>${t.name}${current ? ' <em>I bruk</em>' : ''}</strong>
          <span>${tonn(t.rate)} per time · varer ${t.lifeHours} timer</span>
          <span>Gir ca. <b class="mn-plus">${perHour(t.rate * valuePerTonn(def))}</b> her</span>
        </div>
        <div class="mn-tool-buy">
          <b>${formatMoneyWhole(price)}</b>
          <button class="mn-mini-btn ${state.balance >= price ? '' : 'poor'} ${sure ? 'confirm' : ''}" data-action="m-tool" data-id="${b.id}" data-mine="${m.id}" data-tool="${t.id}">${sure ? 'Trykk igjen' : 'Kjøp'}</button>
        </div>
      </div>`;
  }).join('');
  return `
    <h1 class="con-page-title">Graveverktøy</h1>
    <p class="mn-muted pad">${def.name}. Verktøyet graver til det er slitt ut. Kjøper du et nytt, byttes det gamle ut${m.tool && m.wear > 0 ? ` (det har ${formatDuration(hoursLeft(m) * 3600, false)} igjen)` : ''}.</p>
    <div class="mn-box">${rows}</div>
    <p class="mn-muted">Prisen avhenger av gruva: i dyrere gruver koster verktøyet mer, men det graver også fram mer verdifulle ting.</p>
    <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>`;
}

// =========================================================================
// Alle gruver
// =========================================================================
export function renderMines(state: GameState, b: Business, confirm: string | null): string {
  const first = TOOLS[0];
  const best = TOOLS[TOOLS.length - 1];
  const cards = MINES.map((def) => {
    const owned = ownedMine(b, def.id);
    const sure = confirm === `buy:${def.id}`;
    const chips = Object.entries(def.finds)
      .map(([id, share]) => `<span class="mn-find">${mineralIcon(id as MineralId)}${mineralById(id as MineralId).name} ${pct(share!)}</span>`)
      .join('');
    return `
      <div class="mn-city ${owned ? 'owned' : ''}">
        <div class="mn-card-photo">${photo(def.id)}<div><strong>${def.name}</strong><span>${def.place}, ${def.country}</span></div></div>
        <div class="mn-city-body">
          <div class="mn-finds">${chips}</div>
          <span>Fangst: <b>${weight(yieldPerTonn(def))} per tonn</b> · verdi ${formatMoneyWhole(valuePerTonn(def))} per tonn</span>
          <span>${first.name}: ${perHour(first.rate * valuePerTonn(def))} · ${best.name}: ${perHour(best.rate * valuePerTonn(def))}</span>
          ${
            owned
              ? `<button class="mn-mini-btn" data-action="m-mine" data-id="${b.id}" data-mine="${def.id}">Se gruva</button>`
              : `<div class="mn-city-buy"><b>${formatMoneyWhole(def.price)}</b><span>Klar om ${def.openHours} t · uten verktøy</span>
                 <button class="mn-mini-btn ${state.balance >= def.price ? '' : 'poor'} ${sure ? 'confirm' : ''}" data-action="m-buy" data-id="${b.id}" data-mine="${def.id}">${sure ? 'Trykk igjen' : 'Kjøp'}</button></div>`
          }
        </div>
      </div>`;
  }).join('');
  return `
    <h1 class="con-page-title">Gruver</h1>
    <p class="mn-muted pad">Alle gruvene kan kjøpes. Jo dyrere gruva er, jo mer verdifulle ting finner du – men fangsten (kg per tonn) blir mindre.</p>
    <div class="mn-cities">${cards}</div>`;
}

// =========================================================================
// Ett mineral
// =========================================================================
export function renderResource(state: GameState, b: Business, id: MineralId): string {
  const s = miningOf(b);
  const m = mineralById(id);
  const price = priceNow(s, id);
  const hist = s.prices[id].hist;
  const stock = s.stock[id];
  const cap = capacityOf(s, id);
  const level = s.storage[id];
  const full = isFull(s, id);
  const sell = (share: number, label: string) =>
    `<button class="mn-sell" data-action="m-sell" data-id="${b.id}" data-res="${id}" data-share="${share}" ${stock > 0 ? '' : 'disabled'}>
      <strong>${label}</strong><span>${formatMoney(stock * share * price)}</span>
    </button>`;
  const sources = MINES.filter((d) => d.finds[id])
    .map((d) => {
      const owned = ownedMine(b, d.id);
      return `<div class="mn-row"><span class="mn-row-icon">${icons.pickaxe}</span><div class="mn-row-text"><strong>${d.name}</strong><span>${d.place}, ${d.country} · ${pct(d.finds[id]!)} av funnene</span></div>${owned ? `<b class="mn-owned">${icons.check} Din</b>` : ''}</div>`;
    })
    .join('');
  const perHourKg = s.mines.reduce((sum, o) => sum + (findsPerHour(o).find(([x]) => x === id)?.[1] ?? 0), 0);

  return `
    <div class="mn-res-head">
      ${mineralIcon(id, true)}
      <div><h1>${m.name}</h1><span>Pris per kg</span></div>
    </div>
    <div class="mn-price">
      <strong>${formatPrice(price)}</strong>
      ${change(priceChange(s, id))}<span>siste døgn</span>
    </div>
    ${stockChart(hist, s.priceAt, price, priceNumber, PRICE_STEP_MS)}
    <div class="mn-stats">
      <div><span>Høyest siste døgn</span><b>${formatPrice(Math.max(...hist))}</b></div>
      <div><span>Lavest siste døgn</span><b>${formatPrice(Math.min(...hist))}</b></div>
      <div><span>Normalpris</span><b>${formatPrice(m.price)}</b></div>
      <div><span>Graves per time</span><b>${weight(perHourKg)}</b></div>
    </div>

    <h2 class="mn-title">Lager</h2>
    <div class="mn-box">
      <div class="mn-store">
        <strong>${weight(stock)}</strong><span>av ${weight(cap)}</span>
      </div>
      ${bar(stock / cap, full)}
      <p class="mn-muted small">${full ? '<b class="mn-down">Lageret er fullt – nye funn går tapt.</b>' : perHourKg > 0 ? `Fullt om ca. ${formatDuration(((cap - stock) / perHourKg) * 3600, false)}` : 'Ingen av gruvene dine graver dette nå.'}</p>
      <p class="mn-muted">Verdi nå: <b>${formatMoney(stock * price)}</b></p>
      <div class="mn-sell-row">${sell(0.25, 'Selg 25 %')}${sell(0.5, 'Selg 50 %')}${sell(1, 'Selg alt')}</div>
    </div>

    <h2 class="mn-title">Bygg ut lageret</h2>
    <div class="mn-box">
      ${
        level >= MAX_STORAGE_LEVEL
          ? '<p class="mn-muted">Lageret er bygd ut så mye det går.</p>'
          : `<div class="mn-row">
              <span class="mn-row-icon">${icons.warehouse}</span>
              <div class="mn-row-text"><strong>Nivå ${level + 1} av ${MAX_STORAGE_LEVEL}</strong><span>Plass til ${weight(cap)} → <b class="mn-plus">${weight(capacity(id, level + 1))}</b></span><span>${formatMoneyWhole(storageCost(s, id))}</span></div>
              <button class="mn-mini-btn ${state.balance >= storageCost(s, id) ? '' : 'poor'}" data-action="m-storage" data-id="${b.id}" data-res="${id}">Bygg ut</button>
            </div>`
      }
    </div>

    <h2 class="mn-title">Finnes i</h2>
    <div class="mn-box">${sources}</div>
    <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>`;
}
