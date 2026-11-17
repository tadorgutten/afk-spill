import {
  availableShares,
  buyShares,
  capitalization,
  maxBuyable,
  sellShares,
  DIVIDEND_PERIOD_HOURS,
  dividendYield,
  growthPotential,
  holdingOf,
  marketOf,
  marketVersion,
  ownedStocks,
  portfolioSummary,
  priceChange,
  SORTS,
  sortedStocks,
  stockParams,
  topDividendStock,
  incomeStocks,
  growthStocks,
  topGrowthStock,
  type SortKey,
} from '../game/market';
import type { GameState } from '../game/state';
import { canTradeStocks } from '../game/taxes';
import { PAGE_MAX_WIDTH, PAGE_ZOOM } from '../ui/zoom';
import { stockById, type StockDef } from '../game/stockData';
import { stockChart } from '../ui/chart';
import {
  buyCoins,
  coinById,
  coinCap,
  coinChange,
  coinHolding,
  coinMarket,
  COINS,
  coinsAvailable,
  cryptoSummary,
  cryptoVersion,
  maxBuyableCoins,
  ownedCoins,
  sellCoins,
} from '../game/crypto';
import {
  formatChange,
  formatCoins,
  formatInt,
  formatMoney,
  formatMoneyFull,
  formatPercent,
  formatPrice,
  formatPriceChange,
  formatSignedPercent,
  formatSmallPercent,
} from '../ui/format';
import { icons } from '../ui/icons';
import { stockLogo } from '../ui/stockLogo';
import { showToast } from '../ui/toast';
import { html, type Page } from './page';

/*
 * Investering-siden har flere "visninger" oppå hverandre (som skjermer i en app):
 *   home      – fanene Aksjer / Eiendom / Krypto
 *   portfolio – Mine aksjer
 *   market    – Aksjemarkedet (med sortering)
 *   stock     – én aksje med graf og detaljer
 * Tilbake-pila går ett steg tilbake.
 */
type View =
  | { name: 'home' }
  | { name: 'portfolio' }
  | { name: 'market'; sort: SortKey }
  | { name: 'stock'; id: string }
  | { name: 'trade'; mode: 'buy' | 'sell'; id: string }
  | { name: 'list'; kind: ListKind }
  // Krypto
  | { name: 'coins' }
  | { name: 'coin'; id: string }
  | { name: 'ctrade'; mode: 'buy' | 'sell'; id: string };

/** Egne lister: "Stabil inntekt" og "Vekstpotensial". */
type ListKind = 'income' | 'growth';

type Tab = 'shares' | 'realestate' | 'crypto';

const TABS: { id: Tab; label: string }[] = [
  { id: 'shares', label: 'Aksjer' },
  { id: 'realestate', label: 'Eiendom' },
  { id: 'crypto', label: 'Krypto' },
];

/** + / − farge-klasse */
const trend = (n: number) => (n >= 0 ? 'up' : 'down');

export function createInvestingPage(state: GameState): Page {
  const element = html(`<section class="page investing"></section>`);

  let stack: View[] = [{ name: 'home' }];
  let tab: Tab = 'shares';
  let renderedVersion = '';
  /** Endres når aksje- eller kryptoprisene endres. */
  const pricesVersion = () => `${marketVersion()}-${cryptoVersion()}`;

  const current = () => stack[stack.length - 1];

  function go(view: View) {
    stack.push(view);
    render();
    window.scrollTo(0, 0);
  }

  function back() {
    if (stack.length > 1) stack.pop();
    render();
    window.scrollTo(0, 0);
  }

  /** Tegner visningen på nytt (skjer når prisene endres, og etter kjøp/salg). */
  function render() {
    // Behold sidelengs scroll i sorteringsknappene
    const chips = element.querySelector('.chips');
    const chipScroll = chips?.scrollLeft ?? 0;

    const view = current();
    trade = null;
    element.dataset.view = view.name;

    if (view.name === 'home') {
      element.innerHTML = renderHome();
      fitPagerHeight();
      renderedVersion = pricesVersion();
      return;
    }

    // Undersidene: tilbake-pila svever øverst til venstre (følger med når man scroller)
    const back = `<button class="back-btn" data-action="back" aria-label="Tilbake">${icons.back}</button>`;
    const content =
      view.name === 'trade'
        ? renderTrade(view.mode, view.id)
        : view.name === 'portfolio'
          ? renderPortfolio()
          : view.name === 'market'
            ? renderMarket(view.sort)
            : view.name === 'list'
              ? renderList(view.kind)
              : view.name === 'coins'
                ? renderCoins()
                : view.name === 'coin'
                  ? renderCoin(view.id)
                  : view.name === 'ctrade'
                    ? renderCoinTrade(view.mode, view.id)
                    : renderStock(view.id);
    element.innerHTML = `${back}<div class="inv-zoom inv-pad">${content}</div>`;

    // Kjøp/salg tegnes bare én gang (ellers ville tallet man skriver inn forsvinne)
    if (view.name === 'trade') bindTrade(view.mode, view.id);
    if (view.name === 'ctrade') bindCoinTrade(view.mode, view.id);

    const newChips = element.querySelector('.chips');
    if (newChips) newChips.scrollLeft = chipScroll;
    renderedVersion = pricesVersion();
  }

  // =========================================================================
  // Sveip mellom fanene Aksjer / Eiendom / Krypto
  // =========================================================================
  // Fanene ligger ved siden av hverandre. Mens man drar følger de fingeren
  // (halvveis = halvparten av hver). Slipper man over 50 % (eller sveiper raskt)
  // går den til neste fane, ellers tilbake.
  let tabPos = 0; // 0 = Aksjer, 1 = Eiendom, 2 = Krypto (desimaltall mens man drar)

  const pagerEl = () => element.querySelector<HTMLElement>('.inv-pager');

  /** Flytter fanene og streken under fanenavnene til posisjon `pos`. */
  function applyTabPos(pos: number, animate: boolean) {
    const track = element.querySelector<HTMLElement>('.inv-track');
    const tabs = element.querySelector<HTMLElement>('.inv-tabs');
    if (!track || !tabs) return;
    element.classList.toggle('tabs-animate', animate);
    track.style.transform = `translateX(${-pos * 100}%)`;
    tabs.style.setProperty('--tab-index', String(pos));
    const nearest = Math.round(pos);
    tabs.querySelectorAll('.inv-tab').forEach((b, i) => b.classList.toggle('active', i === nearest));
  }

  /** Høyden følger fanen som vises (ellers kunne man scrollet ned i tomrom på korte faner). */
  function fitPagerHeight(all = false) {
    const pager = pagerEl();
    if (!pager) return;
    const panels = [...pager.querySelectorAll<HTMLElement>('.inv-panel')];
    const index = TABS.findIndex((t) => t.id === tab);
    const height = all ? Math.max(...panels.map((p) => p.offsetHeight)) : panels[index]?.offsetHeight;
    pager.style.height = `${height}px`;
  }

  let settleTimer = 0;
  function goToTab(index: number) {
    index = Math.max(0, Math.min(TABS.length - 1, index));
    tab = TABS[index].id;
    tabPos = index;
    fitPagerHeight(true);
    applyTabPos(index, true);
    clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => fitPagerHeight(), 320);
  }

  let swipe: {
    id: number;
    x0: number;
    y0: number;
    start: number;
    dragging: boolean;
    lastX: number;
    lastT: number;
    velocity: number; // px per ms
  } | null = null;
  let suppressClick = false;

  element.addEventListener('pointerdown', (e) => {
    suppressClick = false;
    if (current().name !== 'home' || !(e.target as HTMLElement).closest('.inv-pager')) return;
    const start = TABS.findIndex((t) => t.id === tab);
    swipe = { id: e.pointerId, x0: e.clientX, y0: e.clientY, start, dragging: false, lastX: e.clientX, lastT: e.timeStamp, velocity: 0 };
  });

  element.addEventListener('pointermove', (e) => {
    if (!swipe || e.pointerId !== swipe.id) return;
    const dx = e.clientX - swipe.x0;
    const dy = e.clientY - swipe.y0;
    if (!swipe.dragging) {
      // Avgjør retning: sidelengs = bytt fane, opp/ned = vanlig scrolling
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return void (swipe = null);
      if (Math.abs(dx) < 10) return;
      swipe.dragging = true;
      element.setPointerCapture(e.pointerId);
      fitPagerHeight(true);
    }
    // Synlig bredde på fanene (hele skjermen, men maks sidebredden – hele appen er zoomet)
    const width = Math.min(window.innerWidth, PAGE_MAX_WIDTH * PAGE_ZOOM);
    const last = TABS.length - 1;
    // Bare én fane av gangen, og litt "gummistrikk" i endene
    let pos = Math.max(swipe.start - 1, Math.min(swipe.start + 1, swipe.start - dx / width));
    if (pos < 0) pos *= 0.3;
    if (pos > last) pos = last + (pos - last) * 0.3;
    tabPos = pos;
    applyTabPos(pos, false);

    const dt = e.timeStamp - swipe.lastT;
    if (dt > 0) swipe.velocity = 0.8 * ((e.clientX - swipe.lastX) / dt) + 0.2 * swipe.velocity;
    swipe.lastX = e.clientX;
    swipe.lastT = e.timeStamp;
  });

  const endSwipe = (e: PointerEvent, cancelled: boolean) => {
    if (!swipe || e.pointerId !== swipe.id) return;
    const s = swipe;
    swipe = null;
    if (!s.dragging) return;
    suppressClick = true; // ikke la slippet telle som et trykk på en knapp
    const moved = tabPos - s.start;
    let target = s.start;
    if (!cancelled) {
      const flick = Math.abs(s.velocity) > 0.4 && Math.abs(moved) > 0.05;
      if (moved > 0.5 || (flick && s.velocity < 0)) target = s.start + 1;
      else if (moved < -0.5 || (flick && s.velocity > 0)) target = s.start - 1;
    }
    goToTab(target);
  };
  element.addEventListener('pointerup', (e) => endSwipe(e, false));
  element.addEventListener('pointercancel', (e) => endSwipe(e, true));

  // Ikke tegn på nytt midt i et trykk (da ville trykket blitt borte)
  let pressing = false;
  element.addEventListener('pointerdown', () => (pressing = true));
  window.addEventListener('pointerup', () => (pressing = false));
  window.addEventListener('pointercancel', () => (pressing = false));

  // --- Alle trykk håndteres her (fungerer selv om innholdet tegnes på nytt) ---
  element.addEventListener('click', (e) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    const { action, id, sort, tab: tabId } = target.dataset;
    const def = id ? stockById(id) : undefined;

    switch (action) {
      case 'back':
        return back();
      case 'tab':
        return goToTab(TABS.findIndex((t) => t.id === tabId));
      case 'portfolio':
        return go({ name: 'portfolio' });
      case 'market':
        return go({ name: 'market', sort: (sort as SortKey) ?? 'cap-desc' });
      case 'sort': {
        const view = current();
        if (view.name === 'market') view.sort = sort as SortKey;
        return render();
      }
      case 'list':
        return go({ name: 'list', kind: target.dataset.list as ListKind });
      case 'stock':
        return go({ name: 'stock', id: id! });
      case 'buy':
      case 'sell':
        if (def) go({ name: 'trade', mode: action as 'buy' | 'sell', id: def.id });
        return;
      // Krypto
      case 'coins':
        return go({ name: 'coins' });
      case 'coin':
        return go({ name: 'coin', id: id! });
      case 'cbuy':
      case 'csell':
        if (id && coinById(id)) go({ name: 'ctrade', mode: action === 'cbuy' ? 'buy' : 'sell', id });
        return;
    }
  });

  // =========================================================================
  // Kjøp / selg aksjer (egen side)
  // =========================================================================
  let trade: { refresh: () => void } | null = null;

  function renderTrade(mode: 'buy' | 'sell', id: string): string {
    const def = stockById(id)!;
    const isBuy = mode === 'buy';
    return `
      ${subHeader()}
      <h1 class="trade-title">${isBuy ? 'Kjøp aksjer' : 'Selg aksjer'}</h1>
      <div class="trade-balance">Saldo: <strong data-t-balance></strong></div>

      <div class="trade-stock">
        ${stockLogo(def)}
        <div class="trade-stock-info">
          <strong>${def.name}</strong>
          <span>${isBuy ? 'Tilgjengelig' : 'Du eier <span data-t-owned></span> stk.'}</span>
        </div>
        <div class="trade-stock-price">
          <strong data-t-price></strong>
          <span data-t-change></span>
        </div>
      </div>

      <label class="trade-label" for="trade-qty">Antall:</label>
      <div class="trade-qty">
        <input id="trade-qty" data-t-qty type="number" inputmode="numeric" min="0" placeholder="0" />
        <button class="trade-max" data-t-max>Maks</button>
      </div>
      <div class="trade-available" data-t-available></div>

      <div class="trade-summary">Sum: <strong data-t-sum></strong></div>
      <button class="trade-confirm" data-t-confirm>${isBuy ? 'Kjøp' : 'Selg'}</button>
    `;
  }

  function bindTrade(mode: 'buy' | 'sell', id: string) {
    const def = stockById(id)!;
    const isBuy = mode === 'buy';
    const q = <T extends HTMLElement = HTMLElement>(sel: string) => element.querySelector<T>(sel)!;
    const input = q<HTMLInputElement>('[data-t-qty]');
    const confirmBtn = q<HTMLButtonElement>('[data-t-confirm]');

    const max = () => (isBuy ? maxBuyable(state, def) : holdingOf(state, def).owned);
    const quantity = () => Math.max(0, Math.floor(Number(input.value) || 0));

    const refresh = () => {
      const price = marketOf(state, def).price;
      const change = priceChange(state, def);
      q('[data-t-balance]').textContent = formatMoney(state.balance);
      q('[data-t-price]').textContent = formatMoney(price);
      const changeEl = q('[data-t-change]');
      changeEl.textContent = formatChange(change.diff, change.pct);
      changeEl.className = trend(change.diff);
      q('[data-t-available]').textContent = isBuy
        ? `${formatInt(availableShares(state, def))} stk. tilgjengelig`
        : `Du kan selge opptil ${formatInt(holdingOf(state, def).owned)} stk.`;
      if (!isBuy) q('[data-t-owned]').textContent = formatInt(holdingOf(state, def).owned);
      q('[data-t-sum]').textContent = formatMoney(quantity() * price);
      confirmBtn.disabled = quantity() < 1 || quantity() > max();
    };

    input.addEventListener('input', refresh);
    q('[data-t-max]').addEventListener('click', () => {
      input.value = String(max());
      refresh();
    });
    confirmBtn.addEventListener('click', () => {
      if (!canTradeStocks(state)) {
        showToast('Aksjehandel er stengt til du har betalt skatten (Profil → Skatt)', 4000);
        return;
      }
      const price = marketOf(state, def).price;
      const count = isBuy ? buyShares(state, def, quantity()) : sellShares(state, def, quantity());
      if (count > 0) {
        showToast(`${isBuy ? 'Kjøpte' : 'Solgte'} ${formatInt(count)} ${def.name} for ${formatMoney(count * price)}`);
        back();
      }
    });

    trade = { refresh };
    refresh();
  }

  // =========================================================================
  // Visninger
  // =========================================================================

  function renderHome(): string {
    const index = TABS.findIndex((t) => t.id === tab);
    tabPos = index;
    const tabs = TABS.map(
      (t) => `<button class="inv-tab ${t.id === tab ? 'active' : ''}" data-action="tab" data-tab="${t.id}">${t.label}</button>`,
    ).join('');

    // Alle tre fanene tegnes ved siden av hverandre, så man kan sveipe mellom dem
    const panels = TABS.map((t) => {
      const content =
        t.id === 'shares'
          ? renderSharesTab()
          : t.id === 'crypto'
            ? renderCryptoTab()
            : `<div class="coming-soon">${t.label} kommer snart</div>`;
      return `<div class="inv-panel"><div class="inv-zoom inv-pad">${content}</div></div>`;
    }).join('');

    // Tittel og faner ligger fast øverst når man scroller
    return `
      <div class="inv-sticky">
        <div class="inv-zoom">
          <h1 class="inv-title">Investering</h1>
          <div class="inv-tabs" style="--tab-index:${index}">${tabs}<span class="inv-tab-line"></span></div>
        </div>
      </div>
      <div class="inv-pager">
        <div class="inv-track" style="transform:translateX(${-index * 100}%)">${panels}</div>
      </div>
    `;
  }

  function renderSharesTab(): string {
    const p = portfolioSummary(state);
    const diff = p.value - p.invested;
    const pct = p.invested > 0 ? (diff / p.invested) * 100 : 0;

    const income = topDividendStock(state);
    const growth = topGrowthStock(state);

    return `
      <button class="portfolio-card" data-action="portfolio">
        <div class="portfolio-card-head">
          ${icons.briefcase}
          <span>Min aksjeportefølje</span>
          <span class="round-chevron">${icons.chevronRight}</span>
        </div>
        <div class="portfolio-card-body">
          <div class="pc-label">Verdi av aksjeporteføljen</div>
          <div class="pc-value">${formatMoney(p.value)}</div>
          <div class="pc-change"><span class="${trend(diff)}">${formatChange(diff, pct)}</span> <span class="pc-all">totalt</span></div>
          <div class="pc-label">Estimert avkastning per time</div>
          <div class="pc-value">${formatMoney(p.perHour)}</div>
        </div>
      </button>

      <button class="market-banner" data-action="market" data-sort="cap-desc">
        <div>
          <strong>Aksjemarkedet</strong>
          <span>Se alle tilgjengelige tilbud</span>
        </div>
        ${icons.chevronRight}
      </button>

      ${pickSection({
        color: 'blue',
        icon: icons.scale,
        title: 'Stabil inntekt',
        subtitle: 'Aksjene med høyest utbytte',
        def: income,
        value: formatPercent(dividendYield(state, income)),
        list: 'income',
      })}

      ${pickSection({
        color: 'orange',
        icon: icons.flame,
        title: 'Vekstpotensial',
        subtitle: 'Aksjer som kan stige',
        def: growth,
        value: formatPercent(Math.max(0, growthPotential(state, growth))),
        list: 'growth',
      })}
    `;
  }

  function pickSection(o: {
    color: 'blue' | 'orange';
    icon: string;
    title: string;
    subtitle: string;
    def: StockDef;
    value: string;
    list: ListKind;
  }): string {
    return `
      <section class="pick pick-${o.color}">
        <div class="pick-head"><span class="pick-icon">${o.icon}</span><h2>${o.title}</h2></div>
        <p>${o.subtitle}</p>
        <div class="pick-row">
          <button class="pick-stock" data-action="stock" data-id="${o.def.id}">
            ${stockLogo(o.def)}
            <div><strong>${o.def.name}</strong><span>${o.value}</span></div>
          </button>
          <div class="pick-actions">
            <button class="pill-btn" data-action="buy" data-id="${o.def.id}">Kjøp</button>
            <button class="link-btn" data-action="list" data-list="${o.list}">Vis alle ${icons.arrowRight}</button>
          </div>
        </div>
      </section>
    `;
  }

  /** Egen side for "Stabil inntekt" (utbytte, blått) eller "Vekstpotensial" (oransje). */
  function renderList(kind: ListKind): string {
    const isIncome = kind === 'income';
    const stocks = isIncome ? incomeStocks(state) : growthStocks(state);
    const rows = stocks
      .map((def) => {
        const owned = holdingOf(state, def).owned;
        const status = owned > 0 ? `Du eier ${formatInt(owned)} stk.` : availableShares(state, def) > 0 ? 'Tilgjengelig' : 'Utsolgt';
        const value = isIncome ? dividendYield(state, def) : growthPotential(state, def);
        return `
          <button class="stock-row" data-action="stock" data-id="${def.id}">
            ${stockLogo(def)}
            <div class="stock-row-info"><strong>${def.name}</strong><span>${status}</span></div>
            <div class="stock-row-right">
              <strong class="${isIncome ? 'pct-blue' : 'pct-orange'}">${formatPercent(value)}</strong>
              <span class="row-label">${isIncome ? 'Utbytte' : 'Vekstpotensial'}</span>
            </div>
          </button>`;
      })
      .join('');

    const note = isIncome
      ? 'Utbytte per periode på 3 timer, ved dagens pris.'
      : 'Analytikernes kursmål. Ingen garanti – aksjene kan like gjerne falle.';
    return `
      ${subHeader(isIncome ? 'Stabil inntekt' : 'Vekstpotensial')}
      <p class="list-note">${note}</p>
      <div class="stock-list">${rows}</div>
    `;
  }

  /** Plass øverst til tilbake-pila (som svever over innholdet), og evt. en tittel ved siden av. */
  function subHeader(title = ''): string {
    return `<div class="sub-header">${title ? `<h1>${title}</h1>` : ''}</div>`;
  }

  function renderPortfolio(): string {
    const owned = ownedStocks(state);
    const rows = owned
      .map((def) => {
        const h = holdingOf(state, def);
        const value = h.owned * marketOf(state, def).price;
        const pct = h.invested > 0 ? ((value - h.invested) / h.invested) * 100 : 0;
        return `
          <button class="stock-row" data-action="stock" data-id="${def.id}">
            ${stockLogo(def)}
            <div class="stock-row-info"><strong>${def.name}</strong><span>${formatInt(h.owned)} stk.</span></div>
            <div class="stock-row-right"><strong>${formatMoney(value)}</strong><span class="${trend(pct)}">${formatSignedPercent(pct)}</span></div>
          </button>`;
      })
      .join('');

    return `
      ${subHeader('Mine aksjer')}
      ${
        owned.length
          ? `<div class="stock-list">${rows}</div>`
          : `<div class="empty">
               <svg class="empty-icon" viewBox="0 0 64 64" fill="none" stroke-linecap="round" aria-hidden="true">
                 <circle cx="32" cy="32" r="22" stroke="#e6e9ef" stroke-width="5"/>
                 <path d="M32 10a22 22 0 1 1-21.5 17.4" stroke="#4f86f7" stroke-width="5"/>
               </svg>
               <h2>Du eier ingen aksjer</h2>
               <p>Gå til aksjemarkedet for å kjøpe aksjer</p>
             </div>`
      }
    `;
  }

  function renderMarket(sort: SortKey): string {
    const chips = SORTS.map(
      (s) => `<button class="chip ${s.key === sort ? 'active' : ''}" data-action="sort" data-sort="${s.key}">${s.label}</button>`,
    ).join('');

    const rows = sortedStocks(state, sort)
      .map((def) => {
        const s = marketOf(state, def);
        const change = priceChange(state, def);
        // Linje 2 viser det man sorterer etter
        const sub =
          sort === 'growth-desc'
            ? `Potensial ${formatSignedPercent(growthPotential(state, def))}`
            : sort === 'cap-desc' || sort === 'cap-asc'
              ? `Markedsverdi ${formatMoney(capitalization(state, def))}`
              : `Utbytte ${formatPercent(dividendYield(state, def))}`;
        return `
          <button class="stock-row" data-action="stock" data-id="${def.id}">
            ${stockLogo(def)}
            <div class="stock-row-info"><strong>${def.name}</strong><span>${sub}</span></div>
            <div class="stock-row-right"><strong>${formatMoney(s.price)}</strong><span class="${trend(change.pct)}">${formatSignedPercent(change.pct)}</span></div>
          </button>`;
      })
      .join('');

    return `
      ${subHeader('Aksjemarkedet')}
      <div class="chips">${chips}</div>
      <div class="stock-list">${rows}</div>
    `;
  }

  function renderStock(id: string): string {
    const def = stockById(id);
    if (!def) return subHeader();
    const s = marketOf(state, def);
    const h = holdingOf(state, def);
    const change = priceChange(state, def);
    const divYield = dividendYield(state, def);
    const potential = growthPotential(state, def);
    const owns = h.owned > 0;

    // Knapper: eier man aksjen kan man selge eller kjøpe flere
    const actions = owns
      ? `<div class="stock-actions two">
           <button class="action-btn primary" data-action="sell" data-id="${def.id}">Selg</button>
           <button class="action-btn secondary" data-action="buy" data-id="${def.id}">Kjøp flere</button>
         </div>`
      : `<div class="stock-actions">
           <button class="action-btn primary" data-action="buy" data-id="${def.id}">Kjøp aksjer</button>
         </div>`;

    let mine = '';
    if (owns) {
      const value = h.owned * s.price;
      const diff = value - h.invested;
      const pct = h.invested > 0 ? (diff / h.invested) * 100 : 0;
      const sharePct = (h.owned / def.shares) * 100;
      const perHour = (h.owned * stockParams(def).dividendPerShare) / DIVIDEND_PERIOD_HOURS;
      mine = `
        <div class="detail">
          <span class="detail-label">Verdi av dine aksjer</span>
          <strong class="detail-value">${formatMoney(value)}</strong>
          <span class="detail-change ${trend(diff)}">${formatChange(diff, pct)}</span>
        </div>
        <div class="detail">
          <span class="detail-label">Andel i selskapet</span>
          <div class="share-bar"><div style="width:${Math.min(100, sharePct)}%"></div></div>
          <div class="share-row"><strong>${formatSmallPercent(sharePct)}</strong><span>${formatInt(h.owned)} stk.</span></div>
        </div>
        <div class="detail">
          <span class="detail-label">Utbytte til deg per time</span>
          <strong class="detail-value">${formatMoney(perHour)}</strong>
        </div>
        <hr class="detail-divider" />`;
    }

    return `
      ${subHeader()}
      <div class="stock-hero">
        ${stockLogo(def, 'lg')}
        <h1>${def.name}</h1>
      </div>
      ${stockChart(s.history, state.market.lastSample, s.price)}
      ${actions}

      <h2 class="details-title">Detaljer</h2>
      ${mine}
      <div class="detail">
        <span class="detail-label">Aksjekurs</span>
        <strong class="detail-value">${formatMoney(s.price)}</strong>
        <span class="detail-change ${trend(change.diff)}">${formatChange(change.diff, change.pct)} siste 2 timer</span>
      </div>
      <div class="detail">
        <span class="detail-label">Utbytte i perioden*</span>
        <strong class="detail-value">${formatPercent(divYield)}</strong>
        <span class="detail-note">*Periode = ${DIVIDEND_PERIOD_HOURS} timer</span>
      </div>
      <div class="detail">
        <span class="detail-label">Vekstpotensial (kursmål)</span>
        <strong class="detail-value ${trend(potential)}">${formatSignedPercent(potential)}</strong>
        <span class="detail-note">Hva analytikerne tror aksjen kan stige de neste dagene. Ingen garanti – den kan også falle.</span>
      </div>
      <hr class="detail-divider" />
      <div class="detail">
        <span class="detail-label">Markedsverdi</span>
        <strong class="detail-value">${formatMoneyFull(capitalization(state, def))}</strong>
      </div>
      <div class="detail">
        <span class="detail-label">Antall tilgjengelige aksjer</span>
        <strong class="detail-value">${formatInt(availableShares(state, def))}</strong>
      </div>
    `;
  }

  // =========================================================================
  // Krypto
  // =========================================================================

  /** Fanen Krypto: totalverdi med Kjøp-knapp, og myntene du eier. */
  function renderCryptoTab(): string {
    const c = cryptoSummary(state);
    const diff = c.value - c.invested;
    const pct = c.invested > 0 ? (diff / c.invested) * 100 : 0;
    const owned = ownedCoins(state);
    const rows = owned.map((def) => coinRow(def, 'owned')).join('');
    return `
      <div class="crypto-card">
        <div class="crypto-card-label">Total kryptoverdi</div>
        <div class="crypto-card-value">${formatMoney(c.value)}</div>
        <div class="crypto-card-change ${trend(diff)}">${diff >= 0 ? '▲' : '▼'} ${formatChange(Math.abs(diff), pct).slice(2)}</div>
        <button class="crypto-card-buy" data-action="coins">Kjøp</button>
      </div>
      <h2 class="crypto-heading">Mynter</h2>
      ${owned.length ? `<div class="stock-list">${rows}</div>` : `<p class="crypto-empty">Du eier ingen kryptovaluta.</p>`}
    `;
  }

  /** Én rad med en mynt. `owned` viser hvor mye du eier, `market` viser prisen. */
  function coinRow(def: (typeof COINS)[number], kind: 'owned' | 'market'): string {
    const price = coinMarket(state, def).price;
    const h = coinHolding(state, def);
    if (kind === 'owned') {
      const value = h.owned * price;
      const pct = h.invested > 0 ? ((value - h.invested) / h.invested) * 100 : 0;
      return `
        <button class="stock-row" data-action="coin" data-id="${def.id}">
          ${stockLogo(def)}
          <div class="stock-row-info"><strong>${def.name}</strong><span>${formatCoins(h.owned)} ${def.ticker}</span></div>
          <div class="stock-row-right"><strong>${formatMoney(value)}</strong><span class="${trend(pct)}">${formatSignedPercent(pct)}</span></div>
        </button>`;
    }
    const change = coinChange(state, def);
    return `
      <button class="stock-row" data-action="coin" data-id="${def.id}">
        ${stockLogo(def)}
        <div class="stock-row-info"><strong>${def.name}</strong><span>${h.owned > 0 ? `Du eier ${formatCoins(h.owned)} ${def.ticker}` : def.ticker}</span></div>
        <div class="stock-row-right"><strong>${formatPrice(price)}</strong><span class="${trend(change.pct)}">${formatSignedPercent(change.pct)}</span></div>
      </button>`;
  }

  /** Alle myntene man kan kjøpe. */
  function renderCoins(): string {
    return `
      ${subHeader('Kryptomarkedet')}
      <div class="stock-list">${COINS.map((def) => coinRow(def, 'market')).join('')}</div>
    `;
  }

  /** Én mynt med graf og detaljer. */
  function renderCoin(id: string): string {
    const def = coinById(id);
    if (!def) return subHeader();
    const c = coinMarket(state, def);
    const h = coinHolding(state, def);
    const change = coinChange(state, def);
    const owns = h.owned > 0;

    const actions = owns
      ? `<div class="stock-actions two">
           <button class="action-btn primary" data-action="csell" data-id="${def.id}">Selg</button>
           <button class="action-btn secondary" data-action="cbuy" data-id="${def.id}">Kjøp flere</button>
         </div>`
      : `<div class="stock-actions">
           <button class="action-btn primary" data-action="cbuy" data-id="${def.id}">Kjøp</button>
         </div>`;

    let mine = '';
    if (owns) {
      const value = h.owned * c.price;
      const diff = value - h.invested;
      const pct = h.invested > 0 ? (diff / h.invested) * 100 : 0;
      mine = `
        <div class="detail">
          <span class="detail-label">Verdi av dine mynter</span>
          <strong class="detail-value">${formatMoney(value)}</strong>
          <span class="detail-change ${trend(diff)}">${formatChange(diff, pct)}</span>
        </div>
        <div class="detail">
          <span class="detail-label">Du eier</span>
          <strong class="detail-value">${formatCoins(h.owned)} ${def.ticker}</strong>
        </div>
        <hr class="detail-divider" />`;
    }

    return `
      ${subHeader()}
      <div class="coin-hero">
        ${stockLogo(def, 'lg')}
        <div class="coin-hero-info">
          <span class="coin-hero-name">${def.name}</span>
          <strong class="coin-hero-price">${formatPrice(c.price)}</strong>
          <span class="coin-hero-change ${trend(change.diff)}">${change.diff >= 0 ? '▲' : '▼'} ${formatPriceChange(change.diff, change.pct).slice(2)}</span>
        </div>
      </div>
      ${stockChart(c.history, state.crypto.lastSample, c.price, (v) => formatPrice(v).replace(' kr', ''))}
      ${actions}

      <h2 class="details-title">Detaljer</h2>
      ${mine}
      <div class="detail">
        <span class="detail-label">Markedsverdi</span>
        <strong class="detail-value">${formatMoneyFull(coinCap(state, def))}</strong>
      </div>
      <div class="detail">
        <span class="detail-label">Tilgjengelig for kjøp</span>
        <strong class="detail-value">${formatCoins(coinsAvailable(state, def))} ${def.ticker}</strong>
      </div>
    `;
  }

  /** Kjøp / selg mynter. Ingen minstegrense – desimaler er lov. */
  function renderCoinTrade(mode: 'buy' | 'sell', id: string): string {
    const def = coinById(id)!;
    const isBuy = mode === 'buy';
    return `
      ${subHeader()}
      <h1 class="trade-title">${isBuy ? 'Kjøp kryptovaluta' : 'Selg kryptovaluta'}</h1>
      <div class="trade-balance">Saldo: <strong data-t-balance></strong></div>

      <div class="trade-stock">
        ${stockLogo(def)}
        <div class="trade-stock-info">
          <strong>${def.name}</strong>
          <span>${isBuy ? 'Tilgjengelig' : `Du eier <span data-t-owned></span> ${def.ticker}`}</span>
        </div>
        <div class="trade-stock-price">
          <strong data-t-price></strong>
          <span data-t-change></span>
        </div>
      </div>

      <label class="trade-label" for="trade-qty">Antall ${def.ticker}:</label>
      <div class="trade-qty">
        <input id="trade-qty" data-t-qty type="text" inputmode="decimal" autocomplete="off" placeholder="0" />
        <button class="trade-max" data-t-max>Maks</button>
      </div>
      <div class="trade-available" data-t-available></div>

      <div class="trade-summary">Sum: <strong data-t-sum></strong></div>
      <button class="trade-confirm" data-t-confirm>${isBuy ? 'Kjøp' : 'Selg'}</button>
    `;
  }

  function bindCoinTrade(mode: 'buy' | 'sell', id: string) {
    const def = coinById(id)!;
    const isBuy = mode === 'buy';
    const q = <T extends HTMLElement = HTMLElement>(sel: string) => element.querySelector<T>(sel)!;
    const input = q<HTMLInputElement>('[data-t-qty]');
    const confirmBtn = q<HTMLButtonElement>('[data-t-confirm]');

    const max = () => (isBuy ? maxBuyableCoins(state, def) : coinHolding(state, def).owned);
    /** Trykker man Maks, brukes det nøyaktige tallet (ikke det avrundede som vises). */
    let useMax = false;
    const amount = () => {
      if (useMax) return max();
      const n = Number(input.value.replace(/\s/g, '').replace(',', '.'));
      return Number.isFinite(n) && n > 0 ? n : 0;
    };

    const refresh = () => {
      const price = coinMarket(state, def).price;
      const change = coinChange(state, def);
      q('[data-t-balance]').textContent = formatMoney(state.balance);
      q('[data-t-price]').textContent = formatPrice(price);
      const changeEl = q('[data-t-change]');
      changeEl.textContent = `${change.diff >= 0 ? '▲' : '▼'} ${formatPercent(change.pct)}`;
      changeEl.className = trend(change.diff);
      q('[data-t-available]').textContent = isBuy
        ? `Du har råd til ${formatCoins(max())} ${def.ticker}`
        : `Du kan selge opptil ${formatCoins(max())} ${def.ticker}`;
      if (!isBuy) q('[data-t-owned]').textContent = formatCoins(coinHolding(state, def).owned);
      q('[data-t-sum]').textContent = formatMoney(amount() * price);
      confirmBtn.disabled = amount() <= 0 || amount() > max() + 1e-9;
    };

    input.addEventListener('input', () => {
      useMax = false;
      refresh();
    });
    q('[data-t-max]').addEventListener('click', () => {
      useMax = true;
      input.value = String(max()).replace('.', ',');
      refresh();
    });
    confirmBtn.addEventListener('click', () => {
      const price = coinMarket(state, def).price;
      const n = Math.min(amount(), max());
      const count = isBuy ? buyCoins(state, def, n) : sellCoins(state, def, n);
      if (count > 0) {
        showToast(`${isBuy ? 'Kjøpte' : 'Solgte'} ${formatCoins(count)} ${def.ticker} for ${formatMoney(count * price)}`);
        back();
      }
    });

    trade = { refresh };
    refresh();
  }

  return {
    id: 'investing',
    label: 'Investering',
    icon: icons.investing,
    element,
    onShow() {
      // Start alltid på oversikten når man kommer til siden
      stack = [{ name: 'home' }];
      render();
    },
    onBack() {
      // Mobilens tilbakeknapp gjør det samme som tilbake-pila
      if (stack.length <= 1) return false;
      back();
      return true;
    },
    update() {
      // Tegn på nytt bare når prisene har endret seg (én gang i minuttet)
      // Kjøp/salg-siden: bare oppdater tallene (behold det man har skrevet inn)
      if (trade) return trade.refresh();
      if (!pressing && pricesVersion() !== renderedVersion) render();
    },
  };
}
