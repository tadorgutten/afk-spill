import {
  CATEGORIES,
  categoryById,
  cheapestIn,
  closeBusiness,
  closeRefund,
  expansionCost,
  expansionSeconds,
  expectedGrowth,
  incomePerHour,
  isMaxStage,
  MAX_BUSINESSES,
  MAX_STAGE,
  renameBusiness,
  renameCost,
  startBusiness,
  startExpansion,
  taxPerHour,
  totalIncomePerHour,
  typeById,
  typesIn,
  isTaxi,
  buyCar,
  expandCapacity,
  type Business,
  type BusinessCategoryId,
} from '../game/business';
import { capacityOf, carsOf, modelById, type CarClass } from '../game/taxi';
import { maxCars, renderCarShop, renderFleet, renderTaxiDetail, type FleetSort } from './taxiViews';
import type { GameState } from '../game/state';
import { formatDuration, formatInt, formatMoney, formatMoneyRounded } from '../ui/format';
import { icons } from '../ui/icons';
import { showToast } from '../ui/toast';
import { html, type Page } from './page';

/*
 * Bedrifter-siden har flere "visninger" oppå hverandre:
 *   home       – oversikt: total inntekt, "Start en bedrift", Mine bedrifter
 *   categories – velg kategori (foreløpig bare Butikk)
 *   types      – velg type butikk (lokal / liten kjede / stor kjede)
 *   name       – skriv inn navn og start bedriften
 *   detail     – én bedrift: inntekt, trinn, utvidelse
 *   settings   – innstillinger: tall om bedriften, endre navn, legg ned
 *   rename     – endre navn
 * Tilbake-pila (og mobilens tilbakeknapp) går ett steg tilbake.
 */
type View =
  | { name: 'home' }
  | { name: 'categories' }
  | { name: 'types'; category: BusinessCategoryId }
  | { name: 'name'; type: string }
  | { name: 'detail'; id: string }
  | { name: 'settings'; id: string }
  | { name: 'rename'; id: string }
  | { name: 'carShop'; id: string; filter: CarClass | null; selected: string | null; qty: number }
  | { name: 'fleet'; id: string; sort: FleetSort; filter: CarClass | null };

/** Ikon for hver kategori. */
export const CATEGORY_ICON: Record<BusinessCategoryId, string> = { shop: icons.basket, taxi: icons.taxi };

/** Mynt-ikon med 1–3 mynter (billig → dyr). */
function coinStack(n: number): string {
  return `<span class="coin-stack coins-${n}">${Array.from({ length: n }, () => `<span>${icons.coin}</span>`).join('')}</span>`;
}

export function createBusinessPage(state: GameState): Page {
  const element = html(`<section class="page business"></section>`);
  let stack: View[] = [{ name: 'home' }];
  const current = () => stack[stack.length - 1];
  const find = (id: string) => state.businesses.find((b) => b.id === id);

  function go(view: View) {
    stack.push(view);
    render();
    window.scrollTo(0, 0);
  }

  function back() {
    if (stack.length > 1) stack.pop();
    // Bedriften kan ha blitt lagt ned: hopp over visninger for den
    while (stack.length > 1 && 'id' in current() && !find((current() as { id: string }).id)) stack.pop();
    render();
    window.scrollTo(0, 0);
  }

  let lastRender = 0;
  let confirmClose = false;

  /** Tegner visningen på nytt (når man bytter visning, og én gang i sekundet for tall som endres). */
  function render() {
    const chipScroll = [...element.querySelectorAll('.taxi-chips')].map((c) => c.scrollLeft);
    renderView();
    element.querySelectorAll('.taxi-chips').forEach((c, i) => (c.scrollLeft = chipScroll[i] ?? 0));
  }

  function renderView() {
    lastRender = performance.now();
    const view = current();
    element.dataset.view = view.name;
    const backBtn = `<button class="biz-back" data-action="back" aria-label="Tilbake">${icons.back}</button>`;

    switch (view.name) {
      case 'home':
        element.innerHTML = renderHome();
        break;
      case 'categories':
        element.innerHTML = backBtn + renderCategories();
        break;
      case 'types':
        element.innerHTML = backBtn + renderTypes(view.category);
        break;
      case 'name':
        element.innerHTML = backBtn + renderName(view.type);
        bindNameInput();
        break;
      case 'detail': {
        const b = find(view.id);
        element.innerHTML = !b ? '' : isTaxi(b) ? renderTaxiDetail(state, b, heroHtml(b)) : renderDetail(b);
        break;
      }
      case 'carShop': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderCarShop(state, b, view.filter, view.selected, view.qty) : '';
        break;
      }
      case 'fleet': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderFleet(b, view.sort, view.filter) : '';
        break;
      }
      case 'settings': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderSettings(b) : '';
        break;
      }
      case 'rename': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderRename(b) : '';
        bindNameInput();
        break;
      }
    }
  }

  // --- Navn-feltet: knappen er grå til man har skrevet noe -----------------------------
  function bindNameInput() {
    const input = element.querySelector<HTMLInputElement>('[data-name-input]');
    const btn = element.querySelector<HTMLButtonElement>('[data-name-submit]');
    if (!input || !btn) return;
    const refresh = () => (btn.disabled = input.value.trim().length === 0);
    input.addEventListener('input', refresh);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !btn.disabled) btn.click();
    });
    refresh();
  }

  // Ikke tegn på nytt midt i et trykk (da ville trykket blitt borte)
  let pressing = false;
  element.addEventListener('pointerdown', () => (pressing = true));
  window.addEventListener('pointerup', () => (pressing = false));
  window.addEventListener('pointercancel', () => (pressing = false));

  const shake = (el: HTMLElement) => {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  };

  // --- Alle trykk ------------------------------------------------------------------------
  element.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    const { action, id = '', category, type } = target.dataset;
    const view = current();
    if (action !== 'close') confirmClose = false;

    switch (action) {
      case 'back':
        return back();
      case 'start':
        if (state.businesses.length >= MAX_BUSINESSES) {
          return showToast(`Du kan ha maks ${MAX_BUSINESSES} bedrifter`);
        }
        return go({ name: 'categories' });
      case 'category': {
        // Kategorier med bare én type (taxi) går rett til navnet
        const types = typesIn(category as BusinessCategoryId);
        if (types.length === 1) return go({ name: 'name', type: types[0].id });
        return go({ name: 'types', category: category as BusinessCategoryId });
      }

      // --- Taxi ---
      case 'expand-cap': {
        const b = find(id);
        if (!b) return;
        if (!expandCapacity(state, b, Number(target.dataset.index))) {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        return render();
      }
      case 'car-shop':
        return go({ name: 'carShop', id, filter: null, selected: null, qty: 1 });
      case 'fleet':
        return go({ name: 'fleet', id, sort: 'km-desc', filter: null });
      case 'shop-filter':
      case 'fleet-filter': {
        if (view.name !== 'carShop' && view.name !== 'fleet') return;
        const c = target.dataset.class as CarClass;
        view.filter = view.filter === c ? null : c; // trykk igjen: vis alle
        return render();
      }
      case 'fleet-sort':
        if (view.name === 'fleet') view.sort = target.dataset.sort as FleetSort;
        return render();
      // --- Kjøp av biler: velg bil → velg antall i panelet nederst → Kjøp ---
      case 'select-car':
        if (view.name !== 'carShop') return;
        if (view.selected === target.dataset.model) {
          view.selected = null; // trykk på samme bil igjen: lukk panelet
        } else {
          view.selected = target.dataset.model!;
          view.qty = 1;
        }
        return render();
      case 'qty-minus':
      case 'qty-plus':
      case 'qty-max': {
        if (view.name !== 'carShop' || !view.selected) return;
        const b = find(view.id);
        if (!b) return;
        const max = Math.max(1, maxCars(state, b, view.selected));
        if (action === 'qty-minus') view.qty = Math.max(1, view.qty - 1);
        if (action === 'qty-plus') view.qty = Math.min(max, view.qty + 1);
        if (action === 'qty-max') view.qty = max;
        return render();
      }
      case 'buy-cars': {
        if (view.name !== 'carShop' || !view.selected) return;
        const b = find(view.id);
        if (!b) return;
        const m = modelById(view.selected);
        let bought = 0;
        let result: ReturnType<typeof buyCar> = 'ok';
        while (bought < view.qty && (result = buyCar(state, b, m.id)) === 'ok') bought++;
        if (bought > 0) {
          showToast(`Kjøpte ${bought} × ${m.name}`);
          view.selected = null;
          return render();
        }
        shake(target);
        return showToast(result === 'full' ? 'Ingen ledige plasser – utvid kapasiteten' : 'Du har ikke nok penger');
      }
      case 'type':
        return go({ name: 'name', type: type! });
      case 'open':
        return go({ name: 'detail', id });
      case 'settings':
        return go({ name: 'settings', id });
      case 'rename':
        return go({ name: 'rename', id });
      case 'go-taxes':
        // Bytt til Profil → Skatt (main.ts tar seg av det)
        window.dispatchEvent(new CustomEvent('open-taxes'));
        return;

      case 'create': {
        if (view.name !== 'name') return;
        const name = element.querySelector<HTMLInputElement>('[data-name-input]')!.value;
        const t = typeById(view.type);
        if (state.balance < t.openingCost) {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        const b = startBusiness(state, view.type, name);
        if (!b) return;
        showToast(`${b.name} er startet!`);
        // Rett til den nye bedriften (tilbake går til oversikten)
        stack = [{ name: 'home' }, { name: 'detail', id: b.id }];
        render();
        window.scrollTo(0, 0);
        return;
      }

      case 'expand': {
        const b = find(id);
        if (!b) return;
        if (!startExpansion(state, b)) {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        return render();
      }

      case 'do-rename': {
        const b = find(id);
        if (!b) return;
        const name = element.querySelector<HTMLInputElement>('[data-name-input]')!.value;
        if (!renameBusiness(state, b, name)) {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        showToast('Navnet er endret');
        return back();
      }

      case 'close': {
        const b = find(id);
        if (!b) return;
        // Trykk to ganger for å legge ned (så man ikke gjør det ved et uhell)
        if (!confirmClose) {
          confirmClose = true;
          target.textContent = 'Trykk igjen for å legge ned';
          target.classList.add('confirm');
          return;
        }
        confirmClose = false;
        const refund = closeBusiness(state, b);
        showToast(`${b.name} er lagt ned. Du fikk ${formatMoney(refund)}`);
        stack = [{ name: 'home' }];
        render();
        window.scrollTo(0, 0);
        return;
      }
    }
  });

  // =========================================================================
  // Visninger
  // =========================================================================
  function renderHome(): string {
    const list = state.businesses.length
      ? state.businesses.map(renderRow).join('')
      : `<p class="biz-empty">Du eier ingen bedrifter.</p>`;
    return `
      <h1 class="biz-title">Bedrifter</h1>
      <div class="biz-total">
        <strong>${formatMoney(totalIncomePerHour(state))}</strong>
        <span>Total inntekt per time</span>
      </div>
      <button class="biz-start" data-action="start">Start en bedrift</button>
      <div class="biz-list-head">
        <h2>Mine bedrifter</h2>
        <span>${state.businesses.length}/${MAX_BUSINESSES}</span>
      </div>
      <div class="biz-list">${list}</div>
    `;
  }

  function renderRow(b: Business): string {
    const t = typeById(b.type);
    const expanding = b.expansionEnd !== null;
    return `
      <button class="biz-row" data-action="open" data-id="${b.id}">
        <span class="biz-icon cat-${categoryById(t.category).color}">${CATEGORY_ICON[t.category]}</span>
        <span class="biz-row-name"><strong>${escapeHtml(b.name)}</strong><span>${t.name}</span></span>
        <span class="round-chevron">${icons.chevronRight}</span>
        <span class="biz-row-stats">
          ${isTaxi(b) ? `<span>${icons.taxi} ${carsOf(b).length}/${capacityOf(b)}</span>` : `<span>${icons.stage} Trinn ${b.stage} av ${MAX_STAGE}</span>`}
          ${expanding ? `<span class="biz-row-timer">${icons.clock} ${formatDuration((b.expansionEnd! - Date.now()) / 1000, false)}</span>` : ''}
        </span>
        <span class="biz-row-income"><b>${formatMoneyRounded(incomePerHour(b))}</b> per time</span>
      </button>`;
  }

  function renderCategories(): string {
    const cards = CATEGORIES.map(
      (c) => `
        <button class="biz-cat" data-action="category" data-category="${c.id}">
          <span class="biz-icon lg cat-${c.color}">${CATEGORY_ICON[c.id]}</span>
          <strong>${c.name}</strong>
          <span>Fra ${formatInt(cheapestIn(c.id))} kr</span>
        </button>`,
    ).join('');
    return `
      <h1 class="biz-page-title">Velg en ny bedriftskategori</h1>
      <div class="biz-cats">${cards}</div>
    `;
  }

  function renderTypes(category: BusinessCategoryId): string {
    const rows = typesIn(category)
      .map(
        (t) => `
        <button class="biz-type" data-action="type" data-type="${t.id}">
          ${coinStack(t.coins)}
          <span><strong>${t.name}</strong><span>Åpningskostnad ${formatMoneyRounded(t.openingCost)}</span></span>
        </button>`,
      )
      .join('');
    return `
      <h1 class="biz-page-title">${categoryById(category).chooseTitle}</h1>
      <div class="biz-types">${rows}</div>
    `;
  }

  function renderName(typeId: string): string {
    const t = typeById(typeId);
    return `
      <h1 class="biz-page-title spaced">${categoryById(t.category).nameTitle}</h1>
      ${nameField('')}
      <div class="biz-price"><span>Åpningskostnad</span><strong>${formatMoneyRounded(t.openingCost)}</strong></div>
      <button class="biz-blue-btn" data-action="create" data-name-submit>Start bedriften</button>
    `;
  }

  function nameField(value: string): string {
    return `
      <label class="biz-name-field">
        <input data-name-input type="text" maxlength="24" placeholder="Navn" value="${escapeHtml(value)}" autocomplete="off" />
        ${icons.pencil}
      </label>`;
  }

  function renderDetail(b: Business): string {
    const t = typeById(b.type);
    const expanding = b.expansionEnd !== null;

    let action: string;
    if (expanding) {
      action = `
        <div class="biz-outlets">
          <div class="biz-outlets-head">${icons.store}<h2>Utvidelse pågår</h2></div>
          <strong class="biz-big">${formatDuration((b.expansionEnd! - Date.now()) / 1000)}</strong>
          <span class="biz-muted">Gjenstående tid</span>
        </div>`;
    } else if (isMaxStage(b)) {
      action = `
        <div class="biz-outlets">
          <div class="biz-outlets-head">${icons.store}<h2>Fullt utbygd</h2></div>
          <span class="biz-muted">Bedriften har nådd høyeste trinn (${MAX_STAGE}).</span>
        </div>`;
    } else {
      const cost = expansionCost(b);
      action = `
        <div class="biz-outlets">
          <div class="biz-outlets-head">${icons.store}<h2>Åpning av nye utsalgssteder</h2></div>
          <p class="biz-explain">Flere butikker gir mer inntekt. Utvidelsen tar ${formatDuration(expansionSeconds(b), false)}, og bedriften tjener som før mens den pågår.</p>
          <strong class="biz-big">${formatMoneyRounded(cost)}</strong>
          <span class="biz-muted">Nødvendig investering</span>
          <strong class="biz-big growth">${icons.arrowUp} ${formatMoneyRounded(expectedGrowth(b))}</strong>
          <span class="biz-muted">Forventet økning i inntekt per time</span>
        </div>
        <button class="biz-green-btn ${state.balance >= cost ? '' : 'poor'}" data-action="expand" data-id="${b.id}">Åpne nye utsalgssteder</button>
        <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>`;
    }

    return `
      ${heroHtml(b)}
      <div class="biz-income-card">
        <strong>${formatMoneyRounded(incomePerHour(b))}</strong>
        <span>Inntekt per time</span>
      </div>
      <div class="biz-tiles">
        <div class="biz-tile small">${icons.stage}<strong>${b.stage}</strong><span>Trinn</span></div>
        <div class="biz-tile">${icons.items}<strong>${t.name}</strong><span>Kategori</span></div>
      </div>
      ${action}
    `;
  }

  /** Den fargede toppen på en bedrift (tilbake, navn, innstillinger). */
  function heroHtml(b: Business): string {
    const t = typeById(b.type);
    return `
      <div class="biz-hero cat-${categoryById(t.category).color}">
        <button class="biz-hero-btn left" data-action="back" aria-label="Tilbake">${icons.back}</button>
        <button class="biz-hero-btn right" data-action="settings" data-id="${b.id}" aria-label="Innstillinger">${icons.gear}</button>
        <span class="biz-hero-icon">${CATEGORY_ICON[t.category]}</span>
        <h1>${escapeHtml(b.name)}</h1>
      </div>`;
  }

  function renderSettings(b: Business): string {
    const t = typeById(b.type);
    const cat = categoryById(t.category);
    return `
      <div class="biz-settings-head">
        <span class="biz-icon lg cat-${cat.color}">${CATEGORY_ICON[t.category]}</span>
        <div class="biz-settings-name">
          <h1>${escapeHtml(b.name)}</h1>
          <button class="biz-pencil" data-action="rename" data-id="${b.id}" aria-label="Endre navn">${icons.pencil}</button>
        </div>
      </div>
      <div class="biz-stat big">
        <span class="biz-stat-icon money">${icons.money}</span>
        <span>Inntjening totalt</span>
        <strong>${formatMoney(b.earned)}</strong>
      </div>
      <div class="biz-stat">
        <span class="biz-stat-icon money">${icons.money}</span>
        <span>Kapitalisering</span>
        <strong>${formatMoney(b.invested)}</strong>
      </div>
      <div class="biz-stat">
        <span class="biz-stat-icon up">${icons.arrowUp}</span>
        <span>Inntekt per time</span>
        <strong>${formatMoneyRounded(incomePerHour(b))}</strong>
      </div>
      <hr class="biz-divider" />
      <h2 class="biz-section-title">Skatteinformasjon</h2>
      <div class="biz-stat">
        <span class="biz-stat-icon tax">${icons.receipt}</span>
        <span>Skatteordning</span>
        <strong>Forenklet</strong>
      </div>
      <div class="biz-stat">
        <span class="biz-stat-icon up blue">${icons.arrowUp}</span>
        <span>Skatt per time (5 %)</span>
        <strong>${formatMoneyRounded(taxPerHour(b))}</strong>
      </div>
      <div class="biz-stat">
        <span class="biz-stat-icon tax">${icons.clock}</span>
        <span>Betalingsfrist</span>
        <strong>Automatisk betaling</strong>
      </div>
      <p class="biz-note">Mer informasjon finner du på Skatt-siden under Profil.</p>
      <button class="biz-blue-btn tight" data-action="go-taxes">Gå til skatt</button>
      <hr class="biz-divider" />
      <p class="biz-note">Legger du ned bedriften, får du tilbake 30 % av kapitaliseringen (${formatMoney(closeRefund(b))}).</p>
      <button class="biz-close-btn" data-action="close" data-id="${b.id}">Legg ned bedriften (+30 %)</button>
    `;
  }

  function renderRename(b: Business): string {
    return `
      <h1 class="biz-page-title spaced">Endre navn</h1>
      ${nameField('')}
      <div class="biz-price"><span>Pris</span><strong>${formatMoneyRounded(renameCost(b))}</strong></div>
      <button class="biz-blue-btn" data-action="do-rename" data-id="${b.id}" data-name-submit>Endre navnet</button>
    `;
  }

  return {
    id: 'business',
    label: 'Bedrifter',
    icon: icons.business,
    element,
    onShow() {
      stack = [{ name: 'home' }];
      confirmClose = false;
      render();
    },
    navHidden: () => stack.length > 1, // menyen vises bare på oversikten
    onBack() {
      if (stack.length <= 1) return false;
      back();
      return true;
    },
    update() {
      // Tall som endres (inntekt, nedtelling, saldo) tegnes på nytt én gang i sekundet.
      // Sider med skrivefelt tegnes ikke på nytt (da ville teksten man skriver forsvinne).
      const view = current().name;
      if (view === 'name' || view === 'rename' || view === 'categories' || view === 'types') return;
      if (view === 'settings' && confirmClose) return;
      if (!pressing && performance.now() - lastRender > 1000) render();
    },
  };
}

/** Navn skrevet av spilleren vises som tekst, aldri som HTML. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
