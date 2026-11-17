import { businessesValue, categoryById, typeById } from '../game/business';
import { CATEGORY_ICON } from './business';
import { fortune } from '../game/cards';
import { MAX_LEVEL } from '../game/click';
import { ownedStocks, portfolioSummary } from '../game/market';
import { fortuneNok, RICH_LIST } from '../game/richList';
import type { GameState } from '../game/state';
import {
  BASIC_RATE,
  FINE_RATE,
  payTax,
  rateOf,
  SIMPLIFIED_RATE,
  STOCK_BASIC_THRESHOLD,
  stockScheme,
  totalOwed,
} from '../game/taxes';
import { formatDuration, formatInt, formatMoney } from '../ui/format';
import { icons } from '../ui/icons';
import { showToast } from '../ui/toast';
import { html, type Page } from './page';

/*
 * Profil-siden har disse visningene:
 *   home     – formue, hva formuen består av, Skatt, Verdens rikeste, Statistikk
 *   taxes    – skatteoversikt (Skatt)
 *   taxStock – skatt på aksjer (betal skatt)
 *   taxInfo  – om skattesystemet
 *   rich     – verdens 100 rikeste, med deg på lista
 *   edit     – hvordan du vil bli presentert (navn og arbeidsområde)
 */
type View = 'home' | 'taxes' | 'taxStock' | 'taxInfo' | 'rich' | 'edit';

/** Hva formuen består av. Det som ikke er laget ennå, står som 0 kr. */
const PARTS = [
  { id: 'balance', label: 'Saldo', color: '#5b8fae' },
  { id: 'business', label: 'Bedrifter', color: '#e8756f' },
  { id: 'stocks', label: 'Aksjer', color: '#f2c27a' },
  { id: 'realestate', label: 'Eiendom', color: '#b18cc0' },
  { id: 'transport', label: 'Transport', color: '#7fa883' },
  { id: 'collections', label: 'Samlinger', color: '#9b8cf2' },
  { id: 'crypto', label: 'Krypto', color: '#93d6c0' },
  { id: 'home', label: 'Bolig', color: '#2c5a92' },
] as const;

export function createProfilePage(state: GameState): Page & { openTaxes(): void } {
  const element = html(`<section class="page profile"></section>`);
  let stack: View[] = ['home'];
  const current = () => stack[stack.length - 1];
  /** Åpne seksjoner på "Om skattesystemet". */
  const openInfo = new Set<string>();  let lastRender = 0;

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

  function render() {
    lastRender = performance.now();
    const view = current();
    element.dataset.view = view;
    const backBtn = `<button class="prof-back" data-action="back" aria-label="Tilbake">${icons.back}</button>`;
    const markup =
      view === 'home'
        ? renderHome()
        : view === 'taxes'
          ? renderTaxes()
          : view === 'taxStock'
            ? backBtn + renderTaxStock()
            : view === 'taxInfo'
              ? backBtn + renderTaxInfo()
              : view === 'rich'
                ? renderRich()
                : backBtn + renderEdit();
    element.innerHTML = markup;
    if (view === 'edit') bindEdit();
  }

  // Ikke tegn på nytt midt i et trykk
  let pressing = false;
  element.addEventListener('pointerdown', () => (pressing = true));
  window.addEventListener('pointerup', () => (pressing = false));
  window.addEventListener('pointercancel', () => (pressing = false));

  element.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    switch (target.dataset.action) {
      case 'back':
        return back();
      case 'taxes':
        return go('taxes');
      case 'tax-stock':
        return go('taxStock');
      case 'tax-info':
        return go('taxInfo');
      case 'rich':
        return go('rich');
      case 'edit':
        return go('edit');
      case 'toggle': {
        const id = target.dataset.id!;
        if (openInfo.has(id)) openInfo.delete(id);
        else openInfo.add(id);
        return render();
      }
      case 'pay': {
        if (payTax(state, state.stockTax)) {
          showToast('Skatten er betalt');
        } else {
          target.classList.remove('shake');
          void target.offsetWidth;
          target.classList.add('shake');
          showToast('Du har ikke nok penger');
        }
        return render();
      }
      case 'save': {
        const value = (name: string) => element.querySelector<HTMLInputElement>(`[data-field="${name}"]`)!.value.trim();
        if (!value('first')) return;
        state.profile = { firstName: value('first'), lastName: value('last'), work: value('work') };
        showToast('Profilen er lagret');
        return back();
      }
    }
  });

  // =========================================================================
  // Profil
  // =========================================================================
  function parts(): Record<string, number> {
    return {
      balance: state.balance,
      business: businessesValue(state),
      stocks: portfolioSummary(state).value,
      realestate: 0,
      transport: 0,
      collections: 0,
      crypto: 0,
      home: 0,
    };
  }

  function renderHome(): string {
    const values = parts();
    const total = fortune(state);
    const positive = PARTS.filter((p) => values[p.id] > 0);
    const bar = positive.length
      ? positive.map((p) => `<span style="flex:${values[p.id] / total};background:${p.color}"></span>`).join('')
      : `<span style="flex:1;background:#e6e9ef"></span>`;
    const tiles = PARTS.map(
      (p) => `
        <div class="prof-tile" style="--c:${p.color}">
          <span>${p.label}</span>
          <strong>${formatMoney(values[p.id])}</strong>
        </div>`,
    ).join('');

    const owed = totalOwed(state.stockTax);
    const taxStatus = state.stockTax.suspended
      ? `<span class="prof-tax-status bad">${icons.lock} Inntekt stanset</span>`
      : owed > 0
        ? `<span class="prof-tax-status warn">Skattegjeld: ${formatMoney(owed)}</span>`
        : `<span class="prof-tax-status ok">${icons.check} Alt er betalt</span>`;

    const rank = playerRank();
    const s = state;
    const stat = (label: string, value: string) => `<div class="prof-stat-row"><span>${label}</span><strong>${value}</strong></div>`;

    return `
      <h1 class="prof-title">Profil</h1>
      <div class="prof-fortune">
        <div>
          <strong>${formatMoney(total)}</strong>
          <span>Formue</span>
        </div>
        <span class="prof-avatar">${icons.wallet}</span>
      </div>
      <div class="prof-bar">${bar}</div>
      <div class="prof-tiles">${tiles}</div>
      <hr class="prof-divider" />

      <button class="prof-card prof-taxes" data-action="taxes">
        <span class="prof-bank">${icons.bank}</span>
        <span class="prof-card-text"><strong>Skatt</strong>${taxStatus}</span>
        ${owed > 0 ? '<span class="prof-badge">!</span>' : ''}
      </button>

      <button class="prof-card prof-rich" data-action="rich">
        <span class="prof-card-text"><strong>Verdens rikeste</strong><span><b>#${rank}</b> · Din plassering</span></span>
        <span class="prof-rich-art">${podiumArt()}</span>
      </button>

      <section class="prof-stats">
        <h2>Statistikk</h2>
        ${stat('Antall bedrifter', formatInt(s.businesses.length))}
        ${stat('Selskaper du eier aksjer i', formatInt(ownedStocks(s).length))}
        ${stat('Klikknivå', `${s.clickLevel} av ${MAX_LEVEL}`)}
        ${stat('Antall klikk', formatInt(s.totalClicks))}
        <h3>Tjent</h3>
        ${stat('I klikkeren', formatMoney(s.clickEarned))}
        ${stat('I bedrifter', formatMoney(s.businessEarned))}
        ${stat('På utbytte', formatMoney(s.dividendsEarned))}
        ${stat('På aksjehandel', `${s.tradingProfit < 0 ? '−' : ''}${formatMoney(Math.abs(s.tradingProfit))}`)}
        <h3>Betalt</h3>
        ${stat('Skatt og bøter', formatMoney(s.taxesPaid))}
      </section>
    `;
  }

  /** Liten pall-tegning på kortet "Verdens rikeste". */
  function podiumArt(): string {
    return `<svg viewBox="0 0 120 80" aria-hidden="true">
      <rect x="6" y="46" width="30" height="34" rx="4" fill="#dfe3ea"/>
      <rect x="45" y="22" width="30" height="58" rx="4" fill="#3fae7a"/>
      <rect x="84" y="56" width="30" height="24" rx="4" fill="#cfd5df"/>
      <text x="60" y="44" text-anchor="middle" font-size="20" font-weight="800" fill="#fff" font-family="system-ui, sans-serif">1</text>
    </svg>`;
  }

  // =========================================================================
  // Skatt
  // =========================================================================
  /** Tid igjen til fristen, som tekst. */
  function dueText(): string {
    const acc = state.stockTax;
    if (acc.suspended) return '0 t. 0 min.';
    if (acc.dueAt === null) return stockScheme(state) === 'simplified' ? 'Automatisk' : '–';
    return formatDuration((acc.dueAt - Date.now()) / 1000, false);
  }

  function renderTaxes(): string {
    const acc = state.stockTax;
    const scheme = stockScheme(state);
    const businesses = state.businesses.length
      ? state.businesses
          .map(
            (b) => `
          <div class="tax-item">
            <div class="tax-item-head">
              <span class="biz-icon cat-${categoryById(typeById(b.type).category).color}">${CATEGORY_ICON[typeById(b.type).category]}</span>
              <span class="tax-item-name"><strong>${escapeHtml(b.name)}</strong><span class="ok">${icons.check} Betales automatisk</span></span>
            </div>
            <div class="tax-item-foot">
              <span>${icons.receipt}<span><b>Forenklet</b><small>Skatteordning</small></span></span>
              <span>${icons.clock}<span><b>5 %</b><small>Skattesats</small></span></span>
            </div>
          </div>`,
          )
          .join('')
      : `<p class="tax-empty">Du eier ingen bedrifter.</p>`;

    const status = acc.suspended
      ? `<span class="bad">${icons.lock} Stanset</span>`
      : scheme === 'simplified'
        ? `<span class="ok">${icons.check} Betales automatisk</span>`
        : `<span>Ordinær ordning – betal selv</span>`;

    return `
      <div class="tax-hero">
        <span class="tax-hero-bank">${icons.bank}</span>
        <button class="prof-back in-hero" data-action="back" aria-label="Tilbake">${icons.back}</button>
        <button class="tax-info-btn" data-action="tax-info" aria-label="Om skattesystemet">${icons.info}</button>
        <div class="tax-hero-row">
          <div class="tax-debt"><span>Skattegjeld</span><strong>${formatMoney(totalOwed(acc))}</strong></div>
          <div class="tax-side">
            <span>Saldo:</span><b>${formatMoney(state.balance)}</b>
            <span>Nærmeste betaling</span><b>${dueText()}</b>
          </div>
        </div>
      </div>

      <h2 class="tax-section">Bedrifter</h2>
      ${businesses}

      <h2 class="tax-section">Andre eiendeler</h2>
      <button class="tax-item clickable" data-action="tax-stock">
        <div class="tax-item-head">
          <span class="tax-item-icon">${icons.briefcase}</span>
          <span class="tax-item-name"><strong>Aksjer</strong>${status}</span>
          <span class="round-chevron">${icons.chevronRight}</span>
        </div>
        <div class="tax-item-foot">
          <span>${icons.receipt}<span><b>${formatMoney(totalOwed(acc))}</b><small>Å betale</small></span></span>
          <span>${icons.clock}<span><b>${dueText()}</b><small>Betalingsfrist</small></span></span>
        </div>
      </button>
    `;
  }

  function renderTaxStock(): string {
    const acc = state.stockTax;
    const scheme = stockScheme(state);
    const owed = totalOwed(acc);
    const income = portfolioSummary(state).perHour;
    const rate = rateOf(scheme);

    const note = acc.suspended
      ? 'Fristen har gått ut. Utbyttet er stanset, og du kan ikke handle aksjer før skatten og boten er betalt.'
      : scheme === 'simplified' && owed === 0
        ? 'Aksjeporteføljen din er under 3 mill. kr, så skatten trekkes automatisk fra utbyttet.'
        : 'Betal skatten før fristen, ellers stanses utbyttet og du får en bot.';

    return `
      <div class="tax-page-head">
        <span class="tax-item-icon">${icons.briefcase}</span>
        <h1>Aksjer</h1>
      </div>
      <div class="tax-owed">
        <div class="tax-owed-row">${icons.receipt}<span>Skatt å betale</span></div>
        <strong>${formatMoney(acc.debt)}</strong>
        ${
          acc.fine > 0
            ? `<hr /><div class="tax-owed-row">${icons.money}<span>Bot</span></div><strong>${formatMoney(acc.fine)}</strong>`
            : ''
        }
      </div>
      <div class="tax-due">${icons.clock}<b>${dueText()}</b></div>
      <p class="tax-note">${note}</p>
      <button class="tax-pay" data-action="pay" ${owed > 0 ? '' : 'disabled'}>Betal</button>
      <p class="tax-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>
      <hr class="prof-divider" />
      <h2 class="tax-rate-title">Skattesats</h2>
      <strong class="tax-rate">${Math.round(rate * 100)} %</strong>
      <div class="tax-line"><span>Utbytte per time:</span><b class="up">▲ ${formatMoney(income)}</b></div>
      <div class="tax-line"><span>Skatt per time:</span><b class="down">▼ ${formatMoney(income * rate)}</b></div>
    `;
  }

  function renderTaxInfo(): string {
    const section = (id: string, head: string, body: string) => {
      const open = openInfo.has(id);
      return `
        ${head}
        ${open ? body : ''}
        <button class="info-toggle ${open ? 'open' : ''}" data-action="toggle" data-id="${id}" aria-label="${open ? 'Skjul' : 'Vis mer'}">${icons.chevronDown}</button>`;
    };

    const penalty = (icon: string, text: string) => `<div class="info-penalty">${icon}<span>${text}</span></div>`;

    return `
      <h1 class="prof-page-title">Om skattesystemet</h1>
      <div class="info-intro">${icons.receipt}<p>Skatt er faste innbetalinger som staten krever av inntekten du tjener.</p></div>

      ${section(
        'penalties',
        `<h2 class="info-h">Ansvar og straffer</h2><p class="info-sub">hvis skatten ikke betales</p>`,
        `<div class="info-group">
           <div class="info-group-head">${icons.basket}<strong>Bedrifter</strong></div>
           ${penalty(icons.pause, 'Inntektsstans')}
         </div>
         <div class="info-group">
           <div class="info-group-head">${icons.briefcase}<strong>Aksjer</strong></div>
           ${penalty(icons.pause, 'Inntektsstans (utbyttet stopper)')}
           ${penalty(icons.ban, 'Begrensning av markedsoperasjoner (kan ikke kjøpe eller selge)')}
           ${penalty(icons.money, `Bot (${Math.round(FINE_RATE * 100)} % av skatten)`)}
         </div>`,
      )}

      <hr class="info-line" />
      ${section(
        'simplified',
        `<h2 class="info-h">Forenklet</h2><p class="info-sub">skatteordning</p><p class="info-lead ok">Skatten betales automatisk</p>`,
        `<p class="info-text">Du trenger ikke gjøre noe for å betale skatten.</p>
         <div class="info-rate"><strong>${Math.round(SIMPLIFIED_RATE * 100)} %</strong><span>Skattesats</span></div>
         <h3 class="info-h3">Eiendeler i forenklet ordning</h3>
         <div class="info-asset"><span class="biz-icon cat-green">${icons.basket}</span><span><strong>Butikker</strong><small>Alle typer</small></span></div>
         <div class="info-asset"><span class="biz-icon cat-yellow">${icons.taxi}</span><span><strong>Taxiselskap</strong><small>Inntekten fra bilene</small></span></div>
         <div class="info-asset"><span class="tax-item-icon">${icons.briefcase}</span><span><strong>Aksjer</strong><small>Portefølje under ${formatMoney(STOCK_BASIC_THRESHOLD)}</small></span></div>`,
      )}

      <hr class="info-line" />
      ${section(
        'basic',
        `<h2 class="info-h">Ordinær</h2><p class="info-sub">skatteordning</p><p class="info-lead">Skatten må du betale selv</p>`,
        `<p class="info-text">Skatten samler seg opp som skattegjeld. Fra gjelden starter har du 24 timer på å betale den på Skatt-siden.</p>
         <div class="info-rate"><strong>${Math.round(BASIC_RATE * 100)} %</strong><span>Skattesats</span></div>
         <h3 class="info-h3">Eiendeler i ordinær ordning</h3>
         <div class="info-asset"><span class="tax-item-icon">${icons.briefcase}</span><span><strong>Aksjer</strong><small>Portefølje på ${formatMoney(STOCK_BASIC_THRESHOLD)} eller mer</small></span></div>`,
      )}
    `;
  }

  // =========================================================================
  // Verdens rikeste
  // =========================================================================
  function playerRank(): number {
    const f = fortune(state);
    return RICH_LIST.filter((p) => fortuneNok(p) > f).length + 1;
  }

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter((w) => /^[A-ZÀ-Þ]/.test(w))
      .slice(0, 2)
      .map((w) => w[0])
      .join('');

  /** Farge på initial-sirkelen (alltid den samme for samme navn). */
  const avatarColor = (name: string) => {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `hsl(${h} 35% 42%)`;
  };

  function renderRich(): string {
    const f = fortune(state);
    const p = state.profile;
    const me = {
      name: p.firstName ? `${p.firstName} ${p.lastName}`.trim() : 'Du',
      industry: p.work || 'Seriegründer',
      value: f,
      you: true,
    };
    const people = RICH_LIST.map((r) => ({ name: r.name, industry: r.industry, value: fortuneNok(r), you: false }));
    const all = [...people, me].sort((a, b) => b.value - a.value);

    const avatar = (x: (typeof all)[number], cls = '') =>
      x.you
        ? `<span class="rich-avatar you ${cls}">${icons.wallet}</span>`
        : `<span class="rich-avatar ${cls}" style="background:${avatarColor(x.name)}">${initials(x.name)}</span>`;

    const podium = [all[1], all[0], all[2]]
      .map((x, i) => {
        const place = [2, 1, 3][i];
        return `
          <div class="podium-col p${place}">
            ${avatar(x, 'lg')}
            <span class="podium-name">${x.you ? 'Du' : escapeHtml(x.name)}</span>
            <div class="podium-box"><span>${place}.</span><strong>${formatMoney(x.value)}</strong></div>
          </div>`;
      })
      .join('');

    const rows = all
      .map(
        (x, i) => `
        <div class="rich-row ${x.you ? 'you' : ''}">
          <span class="rich-rank">${i + 1}.</span>
          ${avatar(x)}
          <span class="rich-name"><strong>${escapeHtml(x.name)}</strong><span>${escapeHtml(x.industry)}</span></span>
          <strong class="rich-value">${formatMoney(x.value)}</strong>
        </div>`,
      )
      .join('');

    return `
      <div class="rich-hero">
        <button class="prof-back light in-hero" data-action="back" aria-label="Tilbake">${icons.back}</button>
        <button class="rich-edit" data-action="edit" aria-label="Rediger profil">${icons.pencil}</button>
        <div class="podium">${podium}</div>
      </div>
      <div class="rich-list">${rows}</div>
      <p class="rich-source">Formue fra Forbes sanntidsliste 15. nov. 2026 (1 dollar = 10 kr).</p>
    `;
  }

  // =========================================================================
  // Rediger profil
  // =========================================================================
  function renderEdit(): string {
    const p = state.profile;
    const field = (name: string, placeholder: string, value: string) =>
      `<input class="prof-input" data-field="${name}" type="text" maxlength="30" placeholder="${placeholder}" value="${escapeHtml(value)}" autocomplete="off" />`;
    return `
      <h1 class="prof-page-title small">Hvordan vil du bli presentert?</h1>
      <div class="prof-form">
        ${field('first', 'Fornavn', p.firstName)}
        ${field('last', 'Etternavn (valgfritt)', p.lastName)}
        <div class="prof-form-gap"></div>
        ${field('work', 'Arbeidsområde (valgfritt)', p.work)}
      </div>
      <button class="prof-save" data-action="save">Lagre</button>
    `;
  }

  /** "Lagre" er grå til fornavnet er fylt ut. */
  function bindEdit() {
    const first = element.querySelector<HTMLInputElement>('[data-field="first"]')!;
    const save = element.querySelector<HTMLButtonElement>('.prof-save')!;
    const refresh = () => (save.disabled = first.value.trim().length === 0);
    first.addEventListener('input', refresh);
    refresh();
  }

  return {
    id: 'profile',
    label: 'Profil',
    icon: icons.profile,
    element,
    navHidden: () => stack.length > 1,
    onShow() {
      stack = ['home'];
      render();
    },
    onBack() {
      if (stack.length <= 1) return false;
      back();
      return true;
    },
    /** Åpne Skatt direkte (fra "Gå til skatt" i en bedrift). */
    openTaxes() {
      stack = ['home', 'taxes'];
      render();
      window.scrollTo(0, 0);
    },
    update() {
      // Tall som endres tegnes på nytt én gang i sekundet (ikke på siden med skrivefelt)
      const view = current();
      if (view === 'edit' || view === 'taxInfo') return;
      if (!pressing && performance.now() - lastRender > 1000) render();
    },
  };
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

