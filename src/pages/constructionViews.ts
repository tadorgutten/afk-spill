import type { Business } from '../game/business';
import { quickBuyCost } from '../game/business';
import {
  BUILDINGS,
  buildingById,
  building,
  buildingValue,
  builtCount,
  isReady,
  isUnlocked,
  maxAffordable,
  MAX_PROJECTS,
  missingFor,
  projectsOf,
  QUICK_FEE,
  readyForSale,
  readyValue,
  RESOURCES,
  resourcesOf,
  type BuildingDef,
  type ResourceId,
} from '../game/construction';
import type { GameState } from '../game/state';
import { formatBalance, formatDuration, formatInt, formatMoney, formatMoneyFull, formatMoneyWhole } from '../ui/format';
import { icons } from '../ui/icons';
import { skipBtn } from '../game/skip';

/*
 * Sidene til byggefirmaet:
 *   detail    – oversikt: verdi under bygging / klart for salg, prosjektliste, ressurser
 *   projects  – prosjektlista (bygg som pågår og bygg som kan selges)
 *   buildNew  – velg hva som skal bygges
 *   resources – fyll på ressurser
 * Når man ikke har nok ressurser, vises et lite vindu der man kan kjøpe det som mangler og bygge.
 */

/** Ikon og farge for hver ressurs. */
export const RESOURCE_ICON: Record<ResourceId, string> = {
  men: icons.worker,
  metal: icons.ingots,
  wood: icons.logs,
  concrete: icons.mixer,
};

const amount = (n: number) => formatInt(n);
const withUnit = (id: ResourceId, n: number) => `${amount(n)} ${RESOURCES.find((r) => r.id === id)!.unit}`;

/** Den lille raden med lageret (øverst på flere sider). */
function stockLine(b: Business): string {
  const store = resourcesOf(b);
  return `<div class="con-stock">${RESOURCES.map(
    (r) => `<span class="con-res-${r.id}">${RESOURCE_ICON[r.id]}<b>${withUnit(r.id, store[r.id])}</b></span>`,
  ).join('')}</div>`;
}

export function renderConstructionDetail(state: GameState, b: Business, hero: string): string {
  const store = resourcesOf(b);
  return `
    ${hero}
    <div class="biz-income-card con-values">
      <strong>${formatMoney(buildingValue(b))}</strong>
      <span>Under bygging</span>
      <i class="con-divider"></i>
      <strong>${formatMoney(readyValue(b))}</strong>
      <span>Klart for salg</span>
    </div>
    <button class="con-projects-card" data-action="c-projects" data-id="${b.id}">
      <div class="con-projects-head">${icons.bricks}<strong>Prosjektliste</strong>${icons.chevronRight}</div>
      <div class="con-projects-counts">
        <div><span class="con-count">${icons.clockDashed}<b>${building(b).length}</b></span><span>Under bygging</span></div>
        <div><span class="con-count ready">${icons.checkCircle}<b>${readyForSale(b).length}</b></span><span>Klart for salg</span></div>
      </div>
    </button>
    <button class="con-main-btn" data-action="c-new" data-id="${b.id}">Start nytt byggeprosjekt</button>
    <hr class="con-hr" />
    <h2 class="con-title">Ressurser</h2>
    <div class="con-res-grid">
      ${RESOURCES.map(
        (r) => `
        <div class="con-res-tile con-res-${r.id}">
          ${RESOURCE_ICON[r.id]}
          <div><strong>${r.name}</strong><span>${withUnit(r.id, store[r.id])}</span></div>
        </div>`,
      ).join('')}
    </div>
    <button class="con-refill-btn" data-action="c-refill" data-id="${b.id}">Fyll på ressurser</button>
    <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>
  `;
}

export function renderProjects(b: Business): string {
  const list = [...projectsOf(b)].sort((x, y) => x.end - y.end);
  if (!list.length) {
    return `
      <h1 class="con-page-title">Prosjektliste</h1>
      <div class="con-empty">
        <svg class="con-empty-art" viewBox="0 0 80 80" aria-hidden="true">
          <path d="M40 10a30 30 0 1 0 30 30" fill="none" stroke="#3f7cf4" stroke-width="5" stroke-linecap="round"/>
          <path d="M44 18h26" stroke="#e5e7eb" stroke-width="4" stroke-linecap="round"/>
        </svg>
        <h2>Du har ingen aktive prosjekter</h2>
        <p>Fyll på ressurser og start et nytt bygg</p>
      </div>`;
  }
  const now = Date.now();
  const cards = list.map((p) => {
    const def = buildingById(p.building);
    const ready = isReady(p, now);
    const tagName = ready ? 'button' : 'div';
    return `
      <${tagName} class="con-project ${ready ? 'ready' : ''}" ${ready ? `data-action="c-sell" data-id="${b.id}" data-project="${p.id}"` : ''}>
        <div class="con-project-text">
          <strong>${def.name}</strong>
          ${ready ? '<span class="con-sell-label">Klar for salg</span>' : `<span>${icons.clock}${formatDuration((p.end - now) / 1000, false)}</span>${skipBtn('project', b.id, p.id, true)}`}
          <span>${icons.tag}${formatMoneyWhole(def.price)}</span>
        </div>
        ${ready ? `<span class="con-sell">${icons.dollar}</span>` : ''}
        <img src="${def.image}" alt="" />
      </${tagName}>`;
  });
  return `
    <h1 class="con-page-title">Prosjektliste</h1>
    ${readyForSale(b, now).length ? '<p class="con-hint">Trykk på et ferdig bygg for å selge det.</p>' : ''}
    <div class="con-projects">${cards.join('')}</div>`;
}

/** Krav (ressurser, tid, pris) for et bygg. */
function needGrid(def: BuildingDef): string {
  return `
    <div class="con-need">
      <span class="con-res-metal">${RESOURCE_ICON.metal}${withUnit('metal', def.need.metal)}</span>
      <span class="con-res-men">${RESOURCE_ICON.men}${withUnit('men', def.need.men)}</span>
      <span class="con-res-wood">${RESOURCE_ICON.wood}${withUnit('wood', def.need.wood)}</span>
      <span class="con-res-concrete">${RESOURCE_ICON.concrete}${withUnit('concrete', def.need.concrete)}</span>
      <span>${icons.clock}${def.hours} t.</span>
      <span class="con-price">${icons.tag}${formatMoneyWhole(def.price)}</span>
    </div>`;
}

/**
 * Velg hva som skal bygges. Bygg som er låst opp kan velges, det neste viser kravet,
 * og resten er låst. `short` = bygget man nettopp prøvde uten nok ressurser.
 */
export function renderBuildNew(b: Business, short: string | null): string {
  let shownNext = false;
  const cards = BUILDINGS.map((def) => {
    if (isUnlocked(b, def)) {
      const isShort = short === def.id;
      return `
        <button class="con-type ${isShort ? 'short' : ''}" data-action="c-build" data-id="${b.id}" data-building="${def.id}">
          ${isShort ? '<span class="con-short-label">Ikke nok ressurser</span>' : ''}
          <img src="${def.image}" alt="" />
          <div><strong>${def.name}</strong>${needGrid(def)}</div>
        </button>`;
    }
    if (!shownNext) {
      shownNext = true;
      const req = buildingById(def.unlock!.building);
      const have = Math.min(def.unlock!.count, builtCount(b, req.id));
      const pct = Math.round((have / def.unlock!.count) * 100);
      return `
        <div class="con-type locked">
          <img src="${def.image}" alt="" />
          <div>
            <strong class="con-locked-name">${icons.lock}${def.name}</strong>
            <div class="con-req"><span>Bygg <b>${req.name}</b></span><span>${have}/${def.unlock!.count}</span></div>
            <div class="con-req-bar"><span style="width:${pct}%"></span></div>
          </div>
        </div>`;
    }
    return `
      <div class="con-type locked hidden-type">
        <span class="con-big-lock">${icons.lock}</span>
        <div><strong>Låst</strong><span>Utvid byggefirmaet ditt</span></div>
      </div>`;
  });
  return `
    <h1 class="con-page-title big">Velg hva du vil bygge</h1>
    ${stockLine(b)}
    ${building(b).length >= MAX_PROJECTS ? `<p class="con-full">Du kan ikke bygge flere enn ${MAX_PROJECTS} på en gang. Vent til et bygg er ferdig.</p>` : `<p class="con-count-line">Under bygging: <b>${building(b).length}/${MAX_PROJECTS}</b></p>`}
    <div class="con-types">${cards.join('')}</div>
    ${short ? `<button class="con-float-btn" data-action="c-procure" data-id="${b.id}" data-building="${short}">Fyll på ressurser</button>` : ''}`;
}

/** Vinduet "Ressurser må kjøpes inn" for ett bygg. */
export function renderProcure(state: GameState, b: Business, buildingId: string, animate: boolean): string {
  const def = buildingById(buildingId);
  const missing = missingFor(b, def);
  const rows = RESOURCES.filter((r) => missing[r.id] > 0)
    .map(
      (r) => `
      <div class="con-procure-row con-res-${r.id}">
        ${RESOURCE_ICON[r.id]}<span>${withUnit(r.id, missing[r.id])}</span><b>${formatMoneyFull(missing[r.id] * r.price)}</b>
      </div>`,
    )
    .join('');
  const total = quickBuyCost(b, buildingId);
  return `
    <div class="con-backdrop ${animate ? 'animate' : ''}" data-action="c-procure-close">
      <div class="con-modal">
        <div class="con-modal-head">${icons.store}<strong>${def.name}</strong></div>
        <div class="con-modal-body">
          <p class="con-modal-sub">Ressurser som må kjøpes inn:</p>
          ${rows || '<p class="con-modal-sub">Du har alt som trengs.</p>'}
          <p class="con-modal-sum-label">Sum (inkludert ${Math.round(QUICK_FEE * 100)} % gebyr):</p>
          <strong class="con-modal-sum">${formatMoneyFull(total)}</strong>
          <button class="con-main-btn ${state.balance >= total ? '' : 'poor'}" data-action="c-buy-build" data-id="${b.id}" data-building="${def.id}">Fyll på og bygg</button>
          <p class="con-modal-balance ${state.balance >= total ? '' : 'poor'}">Saldo: ${formatMoney(state.balance)}</p>
        </div>
      </div>
    </div>`;
}

/** Fyll på ressurser: skriv inn hvor mye av hver. */
export function renderResources(state: GameState, b: Business): string {
  return `
    <h1 class="con-page-title big">Ressurser</h1>
    ${stockLine(b)}
    <p class="con-res-balance">Saldo: <b>${formatBalance(state.balance)}</b></p>
    ${RESOURCES.map(
      (r) => `
      <label class="con-input con-res-${r.id}">
        <span class="con-input-name">${RESOURCE_ICON[r.id]}${r.name}</span>
        <input type="number" inputmode="numeric" min="0" step="1" placeholder="0" data-res="${r.id}" />
        <span class="con-input-max">Maks: ${withUnit(r.id, maxAffordable(state.balance, r))} · ${formatMoney(r.price)} per ${r.unit}</span>
      </label>`,
    ).join('')}
    <p class="con-summary">Sum: <b data-res-sum>${formatMoneyFull(0)}</b></p>
    <button class="con-main-btn" data-action="c-refill-buy" data-id="${b.id}" data-res-submit>Fyll på</button>`;
}
