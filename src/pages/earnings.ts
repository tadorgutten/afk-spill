import { activeCard, CARDS, cardById, fortune, unlockedCount } from '../game/cards';
import { buyClickUpgrade, click, isMaxLevel, perClick, upgradeCost } from '../game/click';
import type { GameState } from '../game/state';
import { bankCard } from '../ui/bankCard';
import { formatBalance, formatMoney, formatMoneyRounded, formatMoneyWhole, MONEY_SCALE } from '../ui/format';
import { icons } from '../ui/icons';
import { showToast } from '../ui/toast';
import { html, type Page } from './page';

/**
 * Inntekt: bankkortet med saldo, oppgradering av "per klikk",
 * og et stort felt man trykker på for å tjene penger.
 */
export function createEarningsPage(state: GameState): Page {
  const element = html(`
    <section class="page earnings">
      <div class="earn-header">
        <!-- Trykk på kortet: gå til "Mine kort" -->
        <button class="card-slot" data-open-cards aria-label="Mine kort"></button>

        <!-- Oppgradering av "per klikk": trykk på boksen for å kjøpe neste nivå.
             Den tynne linja viser hvor mye av prisen man har på saldoen. -->
        <button class="click-upgrade" data-upgrade>
          <div class="click-upgrade-main">
            <strong data-per-click></strong>
            <span>per klikk</span>
          </div>
          <div class="click-upgrade-row">
            <span>Nivå <b data-level>1</b></span>
            <span class="click-upgrade-gain" data-next>
              <span class="triangle"></span>
              <b data-next-value></b> per klikk
            </span>
          </div>
          <div class="click-upgrade-bar"><div data-progress></div></div>
          <div class="click-upgrade-cost" data-upgrade-label></div>
        </button>
      </div>

      <div class="tap-area" data-tap>
        <div class="tap-hand">${icons.tap}</div>
        <p>Trykk her for å tjene penger</p>
      </div>

      <!-- "Mine kort" (vises i stedet for innholdet over) -->
      <div class="cards-view">
        <div class="cards-header">
          <button class="cards-back" data-close-cards aria-label="Tilbake">${icons.back}</button>
          <h1 data-cards-title>Mine kort</h1>
        </div>
        <div class="cards-overview">
          <div class="fortune-box">
            <span>Din formue</span>
            <strong data-fortune></strong>
            <small>Saldo + aksjer + bedrifter + eiendeler. Kortene du kan bruke avhenger av formuen din akkurat nå.</small>
          </div>
          <div class="cards-list" data-cards-list></div>
        </div>
        <!-- Ett kort: bildet, teksten og "Bruk dette kortet" -->
        <div class="card-detail">
          <div data-detail-card></div>
          <p class="card-desc" data-detail-desc></p>
          <button class="use-card-btn" data-use-card>Bruk dette kortet</button>
        </div>
      </div>
    </section>
  `);

  const q = <T extends Element = HTMLElement>(sel: string) => element.querySelector<T>(sel)!;
  const cardSlot = q('[data-open-cards]');
  let balanceEl = q('[data-open-cards]'); // byttes ut når kortet tegnes
  let shownCard = '';
  const perClickEl = q('[data-per-click]');
  const levelEl = q('[data-level]');
  const nextEl = q('[data-next]');
  const nextValueEl = q('[data-next-value]');
  const progressEl = q('[data-progress]');
  const labelEl = q('[data-upgrade-label]');
  const upgradeBtn = q<HTMLButtonElement>('[data-upgrade]');
  const tapArea = q('[data-tap]');
  const hand = q('.tap-hand');

  // --- Mine kort -----------------------------------------------------------------
  const fortuneEl = q('[data-fortune]');
  const listEl = q('[data-cards-list]');
  const titleEl = q('[data-cards-title]');
  const detailCardEl = q('[data-detail-card]');
  const detailDescEl = q('[data-detail-desc]');
  const useBtn = q<HTMLButtonElement>('[data-use-card]');
  let cardsOpen = false;
  /** Kortet som vises på egen side (null = lista). */
  let detailId: string | null = null;
  let listKey = '';

  function setCardsOpen(open: boolean) {
    cardsOpen = open;
    detailId = null;
    element.classList.toggle('cards-open', open);
    element.classList.remove('card-detail-open');
    titleEl.textContent = 'Mine kort';
    listKey = ''; // tegn lista på nytt
    window.scrollTo(0, 0);
  }

  function openDetail(id: string | null) {
    detailId = id;
    element.classList.toggle('card-detail-open', id !== null);
    titleEl.textContent = id ? '' : 'Mine kort';
    if (id) {
      const c = cardById(id);
      detailCardEl.innerHTML = bankCard(c.id, state.cardNumber, state.cardExpiry);
      detailDescEl.textContent = c.description;
    } else {
      listKey = '';
    }
    window.scrollTo(0, 0);
  }

  cardSlot.addEventListener('click', () => setCardsOpen(true));
  // Tilbake-pila: fra et kort tilbake til lista, fra lista tilbake til Inntekt
  q('[data-close-cards]').addEventListener('click', () => (detailId ? openDetail(null) : setCardsOpen(false)));

  // Trykk på et kort du kan bruke: åpne kortets egen side
  listEl.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest<HTMLElement>('[data-open-card]');
    if (item) openDetail(item.dataset.openCard!);
  });

  useBtn.addEventListener('click', () => {
    if (!detailId || useBtn.disabled) return;
    state.selectedCard = detailId;
    showToast(`Du bruker nå ${cardById(detailId).name}-kortet`);
  });

  /** Oppdaterer kortets egen side: saldo og om knappen kan trykkes. */
  function updateDetail(s: GameState, f: number) {
    const inUse = activeCard(s, f).id === detailId;
    const available = CARDS.findIndex((c) => c.id === detailId) < unlockedCount(f);
    useBtn.disabled = inUse || !available;
    setText(useBtn, available ? 'Bruk dette kortet' : `Krever ${formatRequirement(cardById(detailId!).requirement)} i formue`);
    const balance = detailCardEl.querySelector<HTMLElement>('[data-card-balance]');
    if (balance) setBalance(balance, s.balance);
  }

  /**
   * Tegner lista med kort. Kortene formuen holder til kan åpnes,
   * det neste har en bar som viser hvor langt man har kommet, og resten er grå og låst.
   */
  function renderCardList(s: GameState, f: number) {
    const n = unlockedCount(f);
    const active = activeCard(s, f);
    listEl.innerHTML = CARDS.map((c, i) => {
      if (i < n) {
        const inUse = active === c;
        return `
          <button class="card-item ${inUse ? 'chosen' : ''}" data-open-card="${c.id}">
            <div class="card-item-head">
              <span>${c.name}</span>
              ${inUse ? `<span class="card-chosen">${icons.check} I bruk</span>` : ''}
            </div>
            ${bankCard(c.id, s.cardNumber, s.cardExpiry)}
          </button>`;
      }
      // Låst: hengelås og kravet. Det neste kortet viser også hvor langt man har kommet.
      const progress = i === n ? Math.min(1, f / c.requirement) : -1;
      return `
        <div class="card-item locked">
          <div class="card-item-head"><span class="card-lock-sm">${icons.lock}</span><span>${c.name}</span></div>
          <div class="card-locked">
            <span class="card-lock-lg">${icons.lock}</span>
            <div class="card-locked-info">
              <span>Krever formue</span>
              <strong>${formatRequirement(c.requirement)}</strong>
              ${progress >= 0 ? `<div class="card-progress"><div data-card-progress data-req="${c.requirement}" style="transform:scaleX(${progress})"></div></div>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function updateCardList(s: GameState) {
    const f = fortune(s);
    if (detailId) return updateDetail(s, f);

    // Tegn lista på nytt bare når antall kort man kan bruke, eller kortet i bruk, endres
    const key = `${unlockedCount(f)}|${activeCard(s, f).id}`;
    if (key !== listKey) {
      renderCardList(s, f);
      listKey = key;
    }
    setText(fortuneEl, formatMoney(f));
    listEl.querySelectorAll<HTMLElement>('[data-card-balance]').forEach((el) => setBalance(el, s.balance));
    const bar = listEl.querySelector<HTMLElement>('[data-card-progress]');
    if (bar) bar.style.transform = `scaleX(${Math.min(1, f / Number(bar.dataset.req))})`;
  }

  // --- Trykk i feltet: tjen penger -----------------------------------------
  // pointerdown (ikke click) så raske trykk og flere fingre teller med en gang
  tapArea.addEventListener('pointerdown', (e) => {
    const earned = click(state);
    showFloatingAmount(tapArea, e.clientX, e.clientY, earned);

    // Liten "dytt" på hånden
    hand.classList.remove('pressed');
    void hand.offsetWidth; // start animasjonen på nytt
    hand.classList.add('pressed');
  });

  // --- Trykk på oppgraderingsboksen: kjøp neste nivå -----------------------
  upgradeBtn.addEventListener('click', () => {
    if (!buyClickUpgrade(state)) {
      upgradeBtn.classList.remove('shake');
      void upgradeBtn.offsetWidth;
      upgradeBtn.classList.add('shake'); // ikke råd: rist litt
    }
  });

  return {
    id: 'earnings',
    label: 'Inntekt',
    icon: icons.earnings,
    element,
    onShow() {
      if (cardsOpen) setCardsOpen(false); // start alltid på hovedvisningen
      // "+$ ..."-tekstene fra trykk før man byttet side skal ikke fortsette når man kommer tilbake
      element.querySelectorAll('.float-amount').forEach((el) => el.remove());
    },
    onBack() {
      // Mobilens tilbakeknapp: kort → lista → Inntekt
      if (!cardsOpen) return false;
      if (detailId) openDetail(null);
      else setCardsOpen(false);
      return true;
    },
    update(s) {
      if (cardsOpen) return updateCardList(s);

      // Valgt kort er byttet: tegn det på nytt
      // Kortet i bruk (faller formuen for lavt, vises det beste kortet man har råd til)
      const active = activeCard(s).id;
      if (active !== shownCard) {
        shownCard = active;
        cardSlot.innerHTML = bankCard(shownCard, s.cardNumber, s.cardExpiry);
        balanceEl = cardSlot.querySelector<HTMLElement>('[data-card-balance]')!;
      }

      const level = s.clickLevel;
      const max = isMaxLevel(level);
      const cost = upgradeCost(level);
      // Fremdriften følger saldoen: bruker man penger (f.eks. på aksjer), går den ned igjen
      const progress = max ? 1 : Math.min(1, s.balance / cost);

      setBalance(balanceEl, s.balance);
      setText(perClickEl, formatMoneyRounded(perClick(level)));
      setText(levelEl, String(level));
      // Hvor mye mer hvert klikk gir på neste nivå
      nextEl.hidden = max;
      if (!max) setText(nextValueEl, `+${formatMoneyRounded(perClick(level + 1) - perClick(level))}`);
      setText(labelEl, max ? 'Maks nivå' : formatMoneyRounded(cost));
      progressEl.style.width = `${progress * 100}%`;
      upgradeBtn.classList.toggle('ready', !max && s.balance + 1e-6 >= cost);
      upgradeBtn.classList.toggle('max', max);
      upgradeBtn.disabled = max;
    },
  };
}

/** Krav til formue: "$ 100 000", "$ 15 M", "$ 1 T". */
function formatRequirement(value: number): string {
  return value * MONEY_SCALE >= 1e6 ? formatMoney(value).replace(',00', '') : formatMoneyWhole(value);
}

/**
 * Saldoen på kortet: hele tallet (ikke forkortet). Er tallet for langt for kortet,
 * krymper skriften akkurat nok til at alt får plass.
 */
function setBalance(el: HTMLElement, value: number) {
  const text = formatBalance(value);
  if (el.textContent === text) return;
  const grew = text.length !== (el.textContent ?? '').length;
  el.textContent = text;
  if (!grew) return; // samme lengde: samme størrelse som før
  el.style.fontSize = '';
  const base = parseFloat(getComputedStyle(el).fontSize);
  if (!el.clientWidth || el.scrollWidth <= el.clientWidth) return;
  el.style.fontSize = `${Math.max(12, Math.floor(base * (el.clientWidth / el.scrollWidth) * 10) / 10)}px`;
}

/** Endrer teksten bare når den faktisk er ny (oppdateringen kjører hver skjermoppdatering). */
function setText(el: HTMLElement, text: string) {
  if (el.textContent !== text) el.textContent = text;
}

/** Viser "+0,10 kr" der man trykket, som flyter oppover og forsvinner. */
function showFloatingAmount(container: HTMLElement, x: number, y: number, amount: number) {
  const rect = container.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'float-amount';
  el.textContent = `+${formatMoney(amount)}`;
  el.style.left = `${x - rect.left}px`;
  el.style.top = `${y - rect.top}px`;
  container.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}
