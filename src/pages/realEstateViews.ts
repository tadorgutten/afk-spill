import {
  baseIncome,
  fullyUpgraded,
  incomeOf,
  marketProperties,
  marketValue,
  ownedOf,
  ownedProperties,
  priceOf,
  propertyById,
  realEstateSummary,
  SALES_TAX,
  upgradeCost,
  upgradesOf,
  type PropertyDef,
} from '../game/realEstate';
import type { GameState } from '../game/state';
import { formatMoneyFull, formatMoneyWhole, formatPercent } from '../ui/format';
import { pinIcon, upgradeIcons } from '../ui/realEstateIcons';

/*
 * Visningene for Eiendom (brukes av Investering-siden):
 *   fanen Eiendom → Eiendomsmarkedet / Min eiendom → én eiendom / kjøpsbekreftelse
 * Alle trykk har data-action, og håndteres i investing.ts.
 */

export type MarketSort = 'desc' | 'asc';
export type MineSort = 'desc' | 'asc' | 'upgradable' | 'full';

const photo = (def: PropertyDef) => `realestate/${def.id}.jpg`;
const pin = pinIcon;

/** Fanen Eiendom: leieinntekt per time, og to store knapper. */
export function renderRealEstateTab(state: GameState): string {
  const { perHour } = realEstateSummary(state);
  return `
    <div class="re-hero">
      <div class="re-hero-value">${formatMoneyFull(perHour)}</div>
      <div class="re-hero-label">Leieinntekt per time</div>
    </div>
    <button class="re-banner" data-action="re-market">
      <span class="re-banner-bg" style="background-image:url(${photo(propertyById('detroit')!)})"></span>
      <strong>Eiendomsmarkedet</strong>
      <span>Kjøp eiendommer over hele verden og tjen leieinntekter!</span>
    </button>
    <button class="re-banner" data-action="re-mine">
      <span class="re-banner-bg" style="background-image:url(${photo(propertyById('beverlyhills')!)})"></span>
      <strong>Min eiendom</strong>
      <span>Liste over eiendommene mine</span>
    </button>
  `;
}

function chips<T extends string>(options: [T, string][], active: T): string {
  return `<div class="chips">${options
    .map(([key, label]) => `<button class="chip ${key === active ? 'active' : ''}" data-action="re-sort" data-sort="${key}">${label}</button>`)
    .join('')}</div>`;
}

const location = (def: PropertyDef) => `<span class="re-location">${pin}<span>${def.location}</span></span>`;

/** Eiendomsmarkedet: alle eiendommene du ikke eier. */
export function renderMarket(state: GameState, sort: MarketSort): string {
  const list = marketProperties(state).sort((a, b) => (sort === 'asc' ? 1 : -1) * (priceOf(a) - priceOf(b)));
  const cards = list
    .map(
      (def) => `
      <div class="re-card">
        <img class="re-photo" src="${photo(def)}" alt="" loading="lazy" />
        <div class="re-card-body">
          <div class="re-card-info">
            <strong class="re-price">${formatMoneyWhole(priceOf(def))}</strong>
            ${location(def)}
          </div>
          <button class="re-buy" data-action="re-buy" data-id="${def.id}">Kjøp</button>
        </div>
      </div>`,
    )
    .join('');
  return `
    <div class="sub-header re-header">
      <div><h1>Eiendomsmarkedet</h1><div class="re-balance">Saldo: <strong data-re-balance></strong></div></div>
    </div>
    ${chips<MarketSort>([['desc', 'Dyrest først'], ['asc', 'Billigst først']], sort)}
    <div class="re-list">${cards || '<p class="crypto-empty">Du eier alle eiendommene!</p>'}</div>
  `;
}

/** Min eiendom: eiendommene du eier, med kjøpte forbedringer. */
export function renderMine(state: GameState, sort: MineSort): string {
  let list = ownedProperties(state);
  if (sort === 'upgradable') list = list.filter((d) => !fullyUpgraded(state, d));
  if (sort === 'full') list = list.filter((d) => fullyUpgraded(state, d));
  list.sort((a, b) => (sort === 'asc' ? 1 : -1) * (marketValue(state, a) - marketValue(state, b)));

  const cards = list
    .map(
      (def) => `
      <button class="re-card" data-action="re-open" data-id="${def.id}">
        <img class="re-photo" src="${photo(def)}" alt="" loading="lazy" />
        <div class="re-card-body">
          <div class="re-card-info">
            <strong class="re-price">${formatMoneyWhole(marketValue(state, def))}</strong>
            ${location(def)}
            ${boughtIcons(state, def)}
          </div>
        </div>
      </button>`,
    )
    .join('');

  const empty = ownedProperties(state).length
    ? '<p class="crypto-empty">Ingen eiendommer her.</p>'
    : '<p class="crypto-empty">Du eier ingen eiendommer ennå. Gå til eiendomsmarkedet for å kjøpe.</p>';
  return `
    <div class="sub-header"><h1>Min eiendom</h1></div>
    ${chips<MineSort>(
      [
        ['desc', 'Dyrest først'],
        ['asc', 'Billigst først'],
        ['upgradable', 'Kan forbedres'],
        ['full', 'Ferdig forbedret'],
      ],
      sort,
    )}
    <div class="re-list">${cards || empty}</div>
  `;
}

/** Små ikoner for forbedringene som er kjøpt. */
function boughtIcons(state: GameState, def: PropertyDef): string {
  const owned = ownedOf(state, def);
  if (!owned) return '';
  const items = upgradesOf(def)
    .map((u, i) => (owned.upgrades[i] ? `<span class="re-chip" title="${u.name}">${upgradeIcons[u.icon]}</span>` : ''))
    .join('');
  return items ? `<div class="re-chips">${items}</div>` : '';
}

/** Én eiendom du eier: inntekt, forbedringer og salg. */
export function renderProperty(state: GameState, id: string, sellArmed: boolean): string {
  const def = propertyById(id);
  const owned = def && ownedOf(state, def);
  if (!def || !owned) return '<div class="sub-header"></div>';

  const available = upgradesOf(def)
    .map((u, i) => {
      if (owned.upgrades[i]) return '';
      const cost = upgradeCost(def, i);
      return `
        <button class="re-upgrade" data-action="re-upgrade" data-id="${def.id}" data-index="${i}" data-re-cost="${cost}">
          <span class="re-upgrade-icon">${upgradeIcons[u.icon]}<i class="re-dot"></i></span>
          <span class="re-upgrade-text">
            <span>${u.name}</span>
            <strong>${formatMoneyFull(cost)}</strong>
            <small>+ ${formatMoneyFull(baseIncome(def) * u.pct)} per time</small>
          </span>
        </button>`;
    })
    .join('');

  const bought = boughtIcons(state, def);
  const value = marketValue(state, def);

  return `
    <div class="sub-header re-header"><div class="re-balance">Saldo: <strong data-re-balance></strong></div></div>
    <img class="re-photo re-photo-big" src="${photo(def)}" alt="" />
    <div class="re-income-row">
      <div>
        <strong>${formatMoneyFull(incomeOf(state, def))}</strong>
        <span>Inntekt per time</span>
      </div>
      ${location(def)}
    </div>
    ${bought ? `<h2 class="re-section">Forbedringer</h2>${bought}` : ''}
    ${available ? `<h2 class="re-section">Tilgjengelige forbedringer</h2><div class="re-upgrades">${available}</div>` : ''}
    <div class="re-value">Markedsverdi: <strong>${formatMoneyFull(value)}</strong></div>
    <button class="re-sell ${sellArmed ? 'armed' : ''}" data-action="re-sell" data-id="${def.id}">
      ${
        sellArmed
          ? `Trykk igjen for å selge<small>Du får ${formatMoneyFull(value * (1 - SALES_TAX))}</small>`
          : `Selg<small>Salgsskatt: ${formatPercent(SALES_TAX * 100, 0)}</small>`
      }
    </button>
  `;
}

/** Kjøpsbekreftelse. */
export function renderBuyConfirm(_state: GameState, id: string): string {
  const def = propertyById(id);
  if (!def) return '<div class="sub-header"></div>';
  return `
    <div class="sub-header"></div>
    <h1 class="trade-title">Kjøpsbekreftelse</h1>
    <div class="re-confirm">
      <div class="re-confirm-row"><span>Sted</span><strong>${def.location}</strong></div>
      <div class="re-confirm-row"><span>Pris</span><strong>${formatMoneyFull(priceOf(def))}</strong></div>
      <div class="re-confirm-row"><span>Inntekt per time</span><strong>${formatMoneyFull(baseIncome(def))}</strong></div>
      <div class="re-confirm-row"><span>Saldo</span><strong data-re-balance></strong></div>
    </div>
    <button class="trade-confirm re-confirm-btn" data-action="re-confirm" data-id="${def.id}" data-re-cost="${priceOf(def)}">Kjøp</button>
  `;
}
