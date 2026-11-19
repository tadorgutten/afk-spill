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
 * Sidene til gruveselskapet (ryddig design i samme stil som flyselskapet):
 *   detail – forsiden: verdi per time, gruvene (rutenett), mineralene, lager og salg
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
const balanceLine = (state: GameState) => `<p class="mn-sub">Saldo: <b>${formatMoneyFull(state.balance)}</b></p>`;

/** Rundt ikon for et mineral i mineralets farge. */
export const mineralIcon = (id: MineralId, big = false) => {
  const m = mineralById(id);
  return `<span class="mn-min-icon ${big ? 'big' : ''}" style="--min:${m.color}">${m.gem ? icons.gem : icons.ore}</span>`;
};

const photo = (id: string) => `<img src="mines/${id}.jpg" alt="" loading="lazy" />`;
const bar = (fill: number, warn = false) =>
  `<div class="mn-bar"><span style="width:${Math.max(0, Math.min(100, fill * 100))}%" class="${warn ? 'low' : ''}"></span></div>`;

/** Hva som er galt med en gruve akkurat nå (eller null). */
function mineProblem(m: OwnedMine): string | null {
  if (!isOpen(m)) return null;
  if (!m.tool) return 'Mangler graveverktøy';
  if (m.wear <= 0) return 'Verktøyet er slitt ut';
  return null;
}

/** Kort status for en gruve (på rutene på forsiden). */
function mineStatus(m: OwnedMine): { text: string; bad: boolean } {
  if (!isOpen(m)) return { text: `Klar om ${formatDuration((m.openAt! - Date.now()) / 1000, false)}`, bad: false };
  const problem = mineProblem(m);
  if (problem) return { text: 'Står stille', bad: true };
  return { text: `${tonn(digRate(m))} / t`, bad: false };
}

// =========================================================================
// Forsiden
// =========================================================================
export function renderMineDetail(state: GameState, b: Business, hero: string): string {
  const s = miningOf(b);
  const stopped = s.mines.filter((m) => mineProblem(m)).length;
  const full = MINERALS.filter((m) => isFull(s, m.id));
  // Bildet øverst: den mest verdifulle gruva man eier
  const best = [...s.mines].sort((a, z) => mineById(z.id).mult - mineById(a.id).mult)[0];

  const tiles = MINES.map((def, i) => {
    const m = ownedMine(b, def.id);
    const status = m ? mineStatus(m) : null;
    return `
      <button class="mn-tile ${m ? 'owned' : ''} ${status?.bad ? 'bad' : ''} ${i === 0 ? 'wide' : ''}" data-action="${m ? 'm-mine' : 'm-mines'}" data-id="${b.id}" data-mine="${def.id}">
        <span class="mn-tile-icon">${m ? icons.pickaxe : icons.plusBox}</span>
        <span class="mn-tile-text"><strong>${def.name}</strong><small>${status ? status.text : formatMoney(def.price)}</small></span>
      </button>`;
  }).join('');

  const minerals = MINERALS.map((m) => {
    const cap = capacityOf(s, m.id);
    const fill = s.stock[m.id] / cap;
    return `
      <button class="mn-res" data-action="m-res" data-id="${b.id}" data-res="${m.id}">
        ${mineralIcon(m.id)}
        <div class="mn-res-text">
          <strong>${m.name}</strong>
          <span>${weight(s.stock[m.id])} på lager</span>
          ${bar(fill, fill >= 0.9999)}
        </div>
        <div class="mn-res-price">
          <b>${formatPrice(priceNow(s, m.id))}</b>
          ${change(priceChange(s, m.id))}
        </div>
      </button>`;
  }).join('');

  return `
    ${hero}
    <div class="biz-income-card">
      <strong>${formatMoneyFull(miningIncome(b))}</strong>
      <span>Verdi av funn per time</span>
    </div>
    ${stopped ? `<button class="mn-alert" data-action="m-mines" data-id="${b.id}">${icons.info}<div><strong>${stopped === 1 ? 'En gruve står stille' : `${stopped} gruver står stille`}</strong><span>Kjøp nytt graveverktøy så de graver igjen.</span></div></button>` : ''}
    ${full.length ? `<div class="mn-alert">${icons.warehouse}<div><strong>Fullt lager: ${full.map((m) => m.name.toLowerCase()).join(', ')}</strong><span>Nye funn går tapt. Selg eller bygg ut lageret.</span></div></div>` : ''}

    <section class="mn-world">
      <div class="mn-world-top">
        ${best ? photo(best.id) : ''}
        <div class="mn-world-text"><h2>Gruvedrift</h2><span>${s.mines.length} av ${MINES.length} gruver</span></div>
      </div>
      <div class="mn-tiles">${tiles}</div>
      <p class="mn-hint">Trykk på en gruve for å se den</p>
    </section>

    <div class="mn-stock-card">
      <div>${icons.warehouse}<b>${formatMoney(stockValue(s))}</b><span>På lager nå</span></div>
      <div>${icons.coin}<b>${formatMoney(s.sold)}</b><span>Solgt for totalt</span></div>
    </div>

    <h2 class="mn-head">${icons.gem}Mineraler</h2>
    <div class="mn-list">${minerals}</div>
    <button class="mn-soft-btn" data-action="m-mines" data-id="${b.id}">${icons.plusBox}Se alle gruver</button>
    ${balanceLine(state)}

    <div class="mn-help">
      <h3>Slik fungerer gruvene</h3>
      <p>Gruvene graver hele tiden, også når appen er lukket. Det de finner, havner på lageret – og du selger selv når prisen er god. Prisene går opp og ned som aksjer.</p>
      <p>Graveverktøyet slites ut etter en stund, og da stopper gruva til du kjøper et nytt. Er et lager fullt, går nye funn av det mineralet tapt.</p>
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
      <button class="mn-row" data-action="m-res" data-id="${b.id}" data-res="${id}">
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
    ${!isOpen(m) ? `<div class="mn-alert info">${icons.clock}<div><strong>Gruva gjøres klar</strong><span>Ferdig om ${formatDuration((m.openAt! - Date.now()) / 1000)}</span></div></div>` : ''}
    ${problem ? `<div class="mn-alert">${icons.info}<div><strong>${problem}</strong><span>Gruva graver ikke før den får et nytt graveverktøy.</span></div></div>` : ''}

    <div class="mn-stats">
      <div><span>Fangst</span><b>${weight(yieldPerTonn(def))} per tonn</b></div>
      <div><span>Graver</span><b>${tonn(digRate(m))} per time</b></div>
      <div><span>Verdi per tonn</span><b>${formatMoneyWhole(valuePerTonn(def))}</b></div>
      <div><span>Gravd totalt</span><b>${tonn(m.dug)}</b></div>
    </div>

    <h2 class="mn-head">${icons.gem}Funn</h2>
    <div class="mn-list">${finds}</div>

    <h2 class="mn-head">${icons.pickaxe}Graveverktøy</h2>
    <div class="mn-card">
      ${
        tool
          ? `<div class="mn-tool-now">
              <div><strong>${tool.name}</strong><span>${tonn(tool.rate)} per time</span></div>
              <span class="mn-count">${m.wear > 0 ? formatDuration(hoursLeft(m) * 3600, false) : 'Slitt ut'}</span>
            </div>
            ${bar(perTool, hoursLeft(m) < 6)}
            <p class="mn-muted">${m.wear > 0 ? `${tonn(m.wear)} igjen før verktøyet er slitt ut` : 'Verktøyet er slitt ut – gruva står stille.'}</p>`
          : '<p class="mn-muted">Gruva har ikke noe graveverktøy ennå.</p>'
      }
    </div>
    <button class="mn-btn" data-action="m-tools" data-id="${b.id}" data-mine="${m.id}">Kjøp nytt graveverktøy</button>
    ${balanceLine(state)}`;
}

// =========================================================================
// Graveverktøy
// =========================================================================
export function renderTools(state: GameState, b: Business, m: OwnedMine, confirm: string | null): string {
  const def = mineById(m.id);
  const rows = TOOLS.map((t) => {
    const price = toolPrice(m.id, t.id);
    const sure = confirm === `tool:${t.id}`;
    const current = m.tool === t.id && m.wear > 0;
    return `
      <div class="mn-shop-row ${current ? 'current' : ''}">
        <div class="mn-shop-top">
          <span class="mn-name-pill">${t.name}</span>
          ${current ? '<span class="mn-in-use">I bruk</span>' : ''}
        </div>
        <div class="mn-shop-info">
          <div>${icons.pickaxe}<span><b>${tonn(t.rate)} / t</b><small>Graver</small></span></div>
          <div>${icons.clock}<span><b>${t.lifeHours} timer</b><small>Varer</small></span></div>
          <div>${icons.coin}<span><b class="mn-plus">${perHour(t.rate * valuePerTonn(def))}</b><small>Gir her</small></span></div>
        </div>
        <div class="mn-buy-row">
          <b>${formatMoneyWhole(price)}</b>
          <button class="mn-pill-btn ${state.balance >= price ? '' : 'off'} ${sure ? 'confirm' : ''}" data-action="m-tool" data-id="${b.id}" data-mine="${m.id}" data-tool="${t.id}">${sure ? 'Trykk igjen' : 'Kjøp'}</button>
        </div>
      </div>`;
  }).join('');
  return `
    <h1 class="mn-page-title">Graveverktøy</h1>
    ${balanceLine(state)}
    <p class="mn-muted pad">${def.name}: verktøyet graver til det er slitt ut. Kjøper du et nytt, byttes det gamle ut${m.tool && m.wear > 0 ? ` (det har ${formatDuration(hoursLeft(m) * 3600, false)} igjen)` : ''}. I dyrere gruver koster verktøyet mer, men gir mer.</p>
    ${rows}`;
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
      <div class="mn-mine-card ${owned ? 'owned' : ''}">
        <div class="mn-mine-head"><div><strong>${def.name}</strong><span>${def.place}, ${def.country}</span></div>${owned ? `<span class="mn-owned">${icons.check} Din</span>` : ''}</div>
        <div class="mn-mine-photo">${photo(def.id)}</div>
        <div class="mn-finds">${chips}</div>
        <div class="mn-mine-lines">
          <div><span>Fangst</span><b>${weight(yieldPerTonn(def))} per tonn</b></div>
          <div><span>Med ${first.name.toLowerCase()}</span><b>${perHour(first.rate * valuePerTonn(def))}</b></div>
          <div><span>Med ${best.name.toLowerCase()}</span><b>${perHour(best.rate * valuePerTonn(def))}</b></div>
        </div>
        ${
          owned
            ? `<button class="mn-soft-btn" data-action="m-mine" data-id="${b.id}" data-mine="${def.id}">Se gruva</button>`
            : `<div class="mn-buy-row">
                 <span class="mn-cost">${icons.bill}<span><b>${formatMoneyWhole(def.price)}</b><small>Klar om ${def.openHours} t · uten verktøy</small></span></span>
                 <button class="mn-pill-btn ${state.balance >= def.price ? '' : 'off'} ${sure ? 'confirm' : ''}" data-action="m-buy" data-id="${b.id}" data-mine="${def.id}">${sure ? 'Trykk igjen' : 'Kjøp'}</button>
               </div>`
        }
      </div>`;
  }).join('');
  return `
    <h1 class="mn-page-title">Gruver</h1>
    ${balanceLine(state)}
    <p class="mn-muted pad">Alle gruvene kan kjøpes. Jo dyrere gruva er, jo mer verdifulle ting finner du – men fangsten (kg per tonn) blir mindre.</p>
    ${cards}`;
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
      return `<div class="mn-row"><span class="mn-row-icon">${icons.pickaxe}</span><div class="mn-row-text"><strong>${d.name}</strong><span>${d.place}, ${d.country} · ${pct(d.finds[id]!)} av funnene</span></div>${owned ? `<span class="mn-owned">${icons.check} Din</span>` : ''}</div>`;
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

    <h2 class="mn-head">${icons.warehouse}Lager</h2>
    <div class="mn-card">
      <div class="mn-store"><strong>${weight(stock)}</strong><span>av ${weight(cap)}</span></div>
      ${bar(stock / cap, full)}
      <p class="mn-muted">${full ? '<b class="mn-down">Lageret er fullt – nye funn går tapt.</b>' : perHourKg > 0 ? `Fullt om ca. ${formatDuration(((cap - stock) / perHourKg) * 3600, false)}` : 'Ingen av gruvene dine graver dette nå.'}</p>
      <div class="mn-store-value"><b>${formatMoneyFull(stock * price)}</b><span>Verdi nå</span></div>
    </div>
    <div class="mn-sell-row">${sell(0.25, 'Selg 25 %')}${sell(0.5, 'Selg 50 %')}${sell(1, 'Selg alt')}</div>

    <h2 class="mn-head">${icons.arrowUpBox}Bygg ut lageret</h2>
    <div class="mn-card">
      ${
        level >= MAX_STORAGE_LEVEL
          ? '<p class="mn-muted">Lageret er bygd ut så mye det går.</p>'
          : `<div class="mn-upgrade">
              <div><strong>Nivå ${level + 1} av ${MAX_STORAGE_LEVEL}</strong><span>Plass til ${weight(cap)} → <b class="mn-plus">${weight(capacity(id, level + 1))}</b></span></div>
            </div>
            <div class="mn-buy-row">
              <b>${formatMoneyWhole(storageCost(s, id))}</b>
              <button class="mn-pill-btn ${state.balance >= storageCost(s, id) ? '' : 'off'}" data-action="m-storage" data-id="${b.id}" data-res="${id}">Bygg ut</button>
            </div>`
      }
    </div>

    <h2 class="mn-head">${icons.pickaxe}Finnes i</h2>
    <div class="mn-list">${sources}</div>
    ${balanceLine(state)}`;
}
