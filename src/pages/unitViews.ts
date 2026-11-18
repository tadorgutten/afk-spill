import type { Business } from '../game/business';
import type { GameState } from '../game/state';
import {
  isUnlocked,
  levelOf,
  MAX_LEVEL_BONUS,
  MAX_UNIT_LEVEL,
  UNITS_TEXT,
  UNLOCK_LEVEL,
  unitById,
  unitCost,
  unitGain,
  unitIncomeAt,
  unitSeconds,
  unitsBonus,
  unitsIncome,
  unitsOf,
  type UnitsKind,
} from '../game/units';
import { formatDuration, formatMoney, formatMoneyRounded, formatPercent } from '../ui/format';
import { icons } from '../ui/icons';

/*
 * Siden for en bedrift med avdelinger (fabrikk, IT-selskap, bank):
 * inntekt, hva som bygges nå, og en liste med avdelinger som kan bygges/oppgraderes.
 * Trykk håndteres i business.ts (data-action="unit-build").
 */
export function renderUnitsDetail(state: GameState, b: Business, hero: string): string {
  const units = unitsOf(b);
  const text = UNITS_TEXT[b.type as UnitsKind];
  const built = units.filter((u) => levelOf(b, u.id) > 0).length;
  const busy = b.expansionEnd !== null;

  // Hva som bygges nå
  let building = '';
  if (busy && b.buildUnit) {
    const u = unitById(b, b.buildUnit)!;
    const next = levelOf(b, u.id) + 1;
    const total = unitSeconds(u, next);
    const left = Math.max(0, (b.expansionEnd! - Date.now()) / 1000);
    const pct = Math.min(100, Math.max(0, (1 - left / total) * 100));
    building = `
      <div class="ent-progress-card">
        <img class="ent-progress-img" src="${u.image}" alt="" />
        <div class="ent-progress-info">
          <span>${text.building} ${u.name} · nivå ${next}</span>
          <strong>${formatDuration(left)}</strong>
          <div class="ent-bar"><span style="width:${pct.toFixed(1)}%"></span></div>
        </div>
      </div>`;
  }

  const cards = units
    .map((u, i) => {
      const lvl = levelOf(b, u.id);
      const unlocked = isUnlocked(b, i);
      const isMax = lvl >= MAX_UNIT_LEVEL;
      const pips = Array.from({ length: MAX_UNIT_LEVEL }, (_, k) => `<span class="${k < lvl ? 'on' : ''}"></span>`).join('');

      let action: string;
      if (!unlocked) {
        action = `<div class="ent-locked">${icons.lock} Krever ${units[i - 1].name} på nivå ${UNLOCK_LEVEL}</div>`;
      } else if (isMax) {
        action = `<div class="ent-maxed">${icons.check} Maks nivå · +${Math.round(MAX_LEVEL_BONUS * 100)} % bonus</div>`;
      } else if (busy && b.buildUnit === u.id) {
        action = `<div class="ent-wait">${icons.clock} Bygges nå</div>`;
      } else {
        const cost = unitCost(u, lvl + 1);
        action = `
          <button class="ent-btn ${state.balance >= cost && !busy ? '' : 'poor'}" data-action="unit-build" data-id="${b.id}" data-unit="${u.id}">
            <span><b>${lvl === 0 ? 'Bygg' : 'Oppgrader'}</b> · ${formatMoney(cost)}</span>
            <small>${icons.clock} ${formatDuration(unitSeconds(u, lvl + 1), false)} · ${icons.arrowUp} ${formatMoneyRounded(unitGain(b, u))} per time</small>
          </button>`;
      }

      return `
        <div class="ent-card ${unlocked ? '' : 'locked'}">
          <div class="ent-card-top">
            <img class="ent-img" src="${u.image}" alt="${u.name}" loading="lazy" />
            <div class="ent-card-info">
              <div class="ent-card-head"><strong>${u.name}</strong><span class="ent-level">Nivå ${lvl}/${MAX_UNIT_LEVEL}</span></div>
              <span class="ent-desc">${u.desc}</span>
              <div class="ent-pips">${pips}</div>
              <span class="ent-income">${lvl > 0 ? `<b>${formatMoneyRounded(unitIncomeAt(u, lvl))}</b> per time` : 'Ikke bygget ennå'}</span>
            </div>
          </div>
          ${action}
        </div>`;
    })
    .join('');

  return `
    ${hero}
    <div class="biz-income-card">
      <strong>${formatMoneyRounded(unitsIncome(b))}</strong>
      <span>Inntekt per time</span>
    </div>
    <div class="ent-tiles">
      <div class="ent-tile"><strong>${built}/${units.length}</strong><span>${text.title === 'Produksjon' ? 'Avdelinger bygget' : 'Avdelinger åpnet'}</span></div>
      <div class="ent-tile"><strong>+${formatPercent(unitsBonus(b) * 100, 0)}</strong><span>Bonus (+10 % per avdeling på maks)</span></div>
    </div>
    ${building}
    <h2 class="ent-title">${text.title}</h2>
    <p class="ent-sub">Saldo: <b>${formatMoney(state.balance)}</b>${busy ? ' · Én bygging om gangen' : ''}</p>
    <div class="ent-list">${cards}</div>
  `;
}
