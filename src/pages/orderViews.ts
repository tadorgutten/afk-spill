import type { Business } from '../game/business';
import type { GameState } from '../game/state';
import {
  doneCount,
  nextCapacityPrice,
  orderCapacity,
  orderDef,
  orderDefs,
  ordersIncome,
  ordersOf,
  ORDERS_TEXT,
  type OrderDef,
  type OrdersKind,
} from '../game/orders';
import { formatDuration, formatInt, formatMoney, formatMoneyRounded } from '../ui/format';
import { icons } from '../ui/icons';

/*
 * Siden for en bedrift med oppdrag (byggefirma, bilforhandler):
 * fortjeneste, kapasitet, "automatisk", oppdrag som pågår og oppdrag man kan starte.
 * Trykk håndteres i business.ts (data-action="order-start" / "order-cap" / "order-auto").
 */
const img = (d: OrderDef) => `<img class="ent-img ${d.flip ? 'flip' : ''}" src="${d.image}" alt="${d.name}" loading="lazy" />`;

export function renderOrdersDetail(state: GameState, b: Business, hero: string): string {
  const text = ORDERS_TEXT[b.type as OrdersKind];
  const active = [...ordersOf(b)].sort((x, y) => x.end - y.end);
  const capacity = orderCapacity(b);
  const full = active.length >= capacity;
  const capPrice = nextCapacityPrice(b);
  const done = doneCount(b);

  const activeHtml = active.length
    ? active
        .map((o) => {
          const d = orderDef(b, o.item);
          const left = Math.max(0, (o.end - Date.now()) / 1000);
          const pct = Math.min(100, Math.max(0, ((Date.now() - o.start) / (o.end - o.start)) * 100));
          return `
          <div class="ent-progress-card">
            ${img(d).replace('ent-img', 'ent-progress-img')}
            <div class="ent-progress-info">
              <span>${d.name} · ${text.payout.toLowerCase()} ${formatMoney(d.payout)}</span>
              <strong>${formatDuration(left)}</strong>
              <div class="ent-bar"><span style="width:${pct.toFixed(1)}%"></span></div>
            </div>
          </div>`;
        })
        .join('')
    : `<p class="ent-empty">${text.empty}</p>`;

  const items = orderDefs(b)
    .map((d) => {
      const locked = done < d.need;
      const profit = d.payout - d.cost;
      const action = locked
        ? `<div class="ent-locked">${icons.lock} Krever ${d.need} ${text.done.toLowerCase()} (du har ${formatInt(done)})</div>`
        : `<button class="ent-btn ${state.balance >= d.cost && !full ? '' : 'poor'}" data-action="order-start" data-id="${b.id}" data-item="${d.id}">
             <span><b>${text.start}</b> · ${formatMoney(d.cost)}</span>
             <small>${icons.clock} ${formatDuration(d.seconds, false)} · ${icons.arrowUp} ${formatMoneyRounded(profit)} fortjeneste</small>
           </button>`;
      return `
        <div class="ent-card ${locked ? 'locked' : ''}">
          <div class="ent-card-top">
            ${img(d)}
            <div class="ent-card-info">
              <div class="ent-card-head"><strong>${d.name}</strong></div>
              <span class="ent-desc">${text.payout}: <b>${formatMoney(d.payout)}</b></span>
              <span class="ent-income"><b>+${Math.round((profit / d.cost) * 100)} %</b> fortjeneste</span>
            </div>
          </div>
          ${action}
        </div>`;
    })
    .join('');

  return `
    ${hero}
    <div class="biz-income-card">
      <strong>${formatMoneyRounded(ordersIncome(b))}</strong>
      <span>Forventet fortjeneste per time</span>
    </div>
    <div class="ent-tiles">
      <div class="ent-tile"><strong>${formatInt(done)}</strong><span>${text.done}</span></div>
      <div class="ent-tile"><strong>${active.length}/${capacity}</strong><span>${text.capacity}</span></div>
    </div>
    ${
      capPrice !== null
        ? `<button class="ent-cap ${state.balance >= capPrice ? '' : 'poor'}" data-action="order-cap" data-id="${b.id}">
             <strong>${text.addCapacity}</strong><span>${formatMoney(capPrice)}</span>
           </button>`
        : `<p class="ent-sub">Du har maks antall ${text.capacity.toLowerCase()}.</p>`
    }
    <button class="ent-toggle ${b.auto ? 'on' : ''}" data-action="order-auto" data-id="${b.id}">
      <span>${text.auto}</span><i></i>
    </button>
    <h2 class="ent-title">${text.active}</h2>
    <div class="ent-list">${activeHtml}</div>
    <h2 class="ent-title">${text.available}</h2>
    <p class="ent-sub">Saldo: <b>${formatMoney(state.balance)}</b>${full ? ` · Alle ${text.capacity.toLowerCase()} er opptatt` : ''}</p>
    <div class="ent-list">${items}</div>
  `;
}
