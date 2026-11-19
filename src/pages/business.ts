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
  MAX_SLOTS,
  MAX_STAGE,
  SLOT_SECONDS,
  buySlot,
  nextSlot,
  slotPrice,
  slotsFull,
  renameBusiness,
  renameCost,
  startBusiness,
  startExpansion,
  taxPerHour,
  totalIncomePerHour,
  typeById,
  typesIn,
  isTaxi,
  engineOf,
  buyCar,
  expandCapacity,
  buyResources,
  sellProject,
  startProject,
  dealerPay,
  type Business,
  type BusinessCategoryId,
} from '../game/business';
import { capacityOf, carsOf, fleetOf, modelById, type CarClass } from '../game/taxi';
import { maxCars, renderCarShop, renderFleet, renderTaxiDetail, type FleetSort } from './taxiViews';
import { buildingById, building as underConstruction, MAX_PROJECTS, emptyResources, readyForSale, readyValue, RESOURCES } from '../game/construction';
import { renderBuildNew, renderConstructionDetail, renderProcure, renderProjects, renderResources } from './constructionViews';
import {
  buyDiagnostics,
  buyMarketCar,
  carById,
  changeSegment,
  dealerModel,
  expandDealer,
  forSale,
  inService,
  marketOf,
  putUpForSale,
  showroomValue,
  startRepair,
  type PartId,
  type SegmentId,
} from '../game/dealer';
import {
  renderDealerDetail,
  renderExpand,
  renderMarket,
  renderMarketCar,
  renderOwnedCar,
  renderService,
  renderShowroom,
  renderSkills,
  renderSpec,
  type ServiceFilter,
} from './dealerViews';
import {
  autoPick,
  buyOffice,
  completed,
  dropProject,
  emptyPicks,
  employeeById,
  fire,
  hireOffer,
  inProgress,
  itOf,
  projectDef,
  quickHire,
  refreshOffers,
  roleById,
  sellItProject,
  startItProject,
  validPicks,
  wagesPerHour,
  type Picks,
  type RoleId,
  type SkillId,
} from '../game/it';
import {
  renderItDetail,
  renderItEmployee,
  renderItHire,
  renderItNew,
  renderItOffer,
  renderItOffers,
  renderItProject,
  renderItProjects,
  renderItRole,
  renderItSetup,
  renderItTeam,
  type StaffSort,
} from './itViews';
import { bankOf, DEFAULT_DEPOSIT, DEFAULT_LOAN, expandVault, setRates } from '../game/bank';
import { bindBankSliders, renderBankControl, renderBankDetail } from './bankViews';
import type { GameState } from '../game/state';
import { formatDuration, formatMoney, formatMoneyFull, formatMoneyRounded, formatMoneyWhole } from '../ui/format';
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
  | { name: 'fleet'; id: string; sort: FleetSort; filter: CarClass | null }
  | { name: 'projects'; id: string }
  | { name: 'buildNew'; id: string; short: string | null }
  | { name: 'resources'; id: string }
  | { name: 'dService'; id: string; filter: ServiceFilter }
  | { name: 'dShowroom'; id: string }
  | { name: 'dMarket'; id: string }
  | { name: 'dMarketCar'; id: string; car: string }
  | { name: 'dCar'; id: string; car: string; sel: PartId[] }
  | { name: 'dSpec'; id: string; pick: SegmentId | null }
  | { name: 'dExpand'; id: string; kind: 'service' | 'showroom' }
  | { name: 'dSkills'; id: string }
  | { name: 'iProjects'; id: string; tab: 'progress' | 'done' }
  | { name: 'iProject'; id: string; project: string }
  | { name: 'iNew'; id: string }
  | { name: 'iSetup'; id: string; def: string; picks: Picks }
  | { name: 'iTeam'; id: string; def: string; picks: Picks; skill: SkillId }
  | { name: 'iRole'; id: string; role: RoleId; sort: StaffSort }
  | { name: 'iEmployee'; id: string; emp: string }
  | { name: 'iHire'; id: string; role: RoleId }
  | { name: 'iOffers'; id: string }
  | { name: 'iOffer'; id: string; offer: string }
  | { name: 'bControl'; id: string; deposit: number; loan: number };

/** Ikon for hver kategori. */
export const CATEGORY_ICON: Record<BusinessCategoryId, string> = {
  shop: icons.basket,
  taxi: icons.taxi,
  shipping: icons.truck,
  factory: icons.factory,
  construction: icons.hook,
  dealer: icons.dealer,
  it: icons.monitor,
  bank: icons.bank,
};

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
    procureFor = null;
    if (stack.length > 1) stack.pop();
    // Bedriften kan ha blitt lagt ned: hopp over visninger for den
    while (stack.length > 1 && 'id' in current() && !find((current() as { id: string }).id)) stack.pop();
    render();
    window.scrollTo(0, 0);
  }

  let lastRender = 0;
  let confirmClose = false;
  /** IT-selskap: "trykk igjen" for å avbryte et prosjekt / gi en ansatt sparken. */
  let confirmDrop = false;
  let confirmFire = false;
  /** Vinduet "Kjøp plasser til bedrifter" er åpent. */
  let slotsOpen = false;
  /** Spill av åpne-animasjonen bare første gang (siden tegnes på nytt hvert sekund). */
  let slotsAnimate = false;
  /** Byggefirma: vinduet "kjøp det som mangler" for dette bygget (eller null). */
  let procureFor: string | null = null;
  let procureAnimate = false;

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
    const viewed = 'id' in view ? find(view.id) : undefined;
    if (viewed && isTaxi(viewed)) element.dataset.fleet = fleetOf(viewed);
    else delete element.dataset.fleet;
    // Fargetema for sidene til en bedrift (se empire.css)
    if (viewed) element.dataset.theme = typeById(viewed.type).category;
    else delete element.dataset.theme;
    const backBtn = `<button class="biz-back" data-action="back" aria-label="Tilbake">${icons.back}</button>`;

    switch (view.name) {
      case 'home':
        element.innerHTML = renderHome() + (slotsOpen ? renderSlots() : '');
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
        if (!b) element.innerHTML = '';
        else if (isTaxi(b)) element.innerHTML = renderTaxiDetail(state, b, heroHtml(b));
        else if (engineOf(b) === 'build') element.innerHTML = renderConstructionDetail(state, b, heroHtml(b));
        else if (engineOf(b) === 'dealer') element.innerHTML = renderDealerDetail(b, heroHtml(b));
        else if (engineOf(b) === 'it') element.innerHTML = renderItDetail(state, b, heroHtml(b));
        else if (engineOf(b) === 'bank') element.innerHTML = renderBankDetail(state, b, heroHtml(b));
        else element.innerHTML = renderDetail(b);
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
      case 'projects': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderProjects(b) : '';
        break;
      }
      case 'buildNew': {
        const b = find(view.id);
        if (!b) {
          element.innerHTML = '';
          break;
        }
        const animate = procureAnimate;
        procureAnimate = false;
        element.innerHTML = backBtn + renderBuildNew(b, view.short) + (procureFor ? renderProcure(state, b, procureFor, animate) : '');
        break;
      }
      case 'resources': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderResources(state, b) : '';
        bindResourceInputs();
        break;
      }
      // --- Bilforhandler ---
      case 'dService': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderService(b, view.filter) : '';
        break;
      }
      case 'dShowroom': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderShowroom(b) : '';
        break;
      }
      case 'dMarket': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderMarket(state, b) : '';
        break;
      }
      case 'dMarketCar': {
        const b = find(view.id);
        const m = b && marketOf(b).find((x) => x.id === view.car);
        if (!b || !m) {
          // Lista er laget på nytt (ny time): bilen finnes ikke lenger
          stack.pop();
          showToast('Bilen er ikke lenger i markedet');
          return renderView();
        }
        element.innerHTML = backBtn + renderMarketCar(state, b, m);
        break;
      }
      case 'dCar': {
        const b = find(view.id);
        const c = b && carById(b, view.car);
        if (!b || !c) {
          stack.pop();
          showToast('Bilen er solgt');
          return renderView();
        }
        element.innerHTML = backBtn + renderOwnedCar(state, b, c, view.sel);
        break;
      }
      case 'dSpec': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderSpec(b, view.pick) : '';
        break;
      }
      case 'dExpand': {
        const b = find(view.id);
        element.dataset.kind = view.kind;
        element.innerHTML = b ? backBtn + renderExpand(state, b, view.kind) : '';
        break;
      }
      case 'dSkills': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderSkills(b) : '';
        break;
      }
      // --- Bank ---
      case 'bControl': {
        const b = find(view.id);
        if (!b) break;
        element.innerHTML = backBtn + renderBankControl(b, view.deposit, view.loan);
        bindBankSliders(element, b, (deposit, loan) => {
          view.deposit = deposit;
          view.loan = loan;
        });
        break;
      }
      // --- IT-selskap ---
      case 'iProjects': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderItProjects(b, view.tab) : '';
        break;
      }
      case 'iProject': {
        const b = find(view.id);
        const p = b && itOf(b).projects.find((x) => x.id === view.project);
        if (!b || !p) {
          stack.pop();
          return renderView();
        }
        element.innerHTML = backBtn + renderItProject(b, p, confirmDrop);
        break;
      }
      case 'iNew': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderItNew(b) : '';
        break;
      }
      case 'iSetup': {
        const b = find(view.id);
        if (!b) break;
        // Fjern valgte som ikke lenger er ledige (fått sparken eller startet et annet prosjekt)
        Object.assign(view.picks, validPicks(b, view.picks));
        element.innerHTML = backBtn + renderItSetup(b, projectDef(view.def), view.picks);
        break;
      }
      case 'iTeam': {
        const b = find(view.id);
        if (!b) break;
        Object.assign(view.picks, validPicks(b, view.picks));
        element.innerHTML = backBtn + renderItTeam(b, projectDef(view.def), view.picks, view.skill);
        break;
      }
      case 'iRole': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderItRole(b, view.role, view.sort) : '';
        break;
      }
      case 'iEmployee': {
        const b = find(view.id);
        const e = b && employeeById(b, view.emp);
        if (!b || !e) {
          stack.pop();
          return renderView();
        }
        element.innerHTML = backBtn + renderItEmployee(b, e, confirmFire);
        break;
      }
      case 'iHire': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderItHire(state, b, view.role) : '';
        bindHireInput();
        break;
      }
      case 'iOffers': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderItOffers(b) : '';
        break;
      }
      case 'iOffer': {
        const b = find(view.id);
        const e = b && itOf(b).offers.find((o) => o.id === view.offer);
        if (!b || !e) {
          stack.pop();
          showToast('Tilbudet er ikke lenger tilgjengelig');
          return renderView();
        }
        element.innerHTML = backBtn + renderItOffer(state, b, e);
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

  // --- IT-selskap: antall å ansette (intervjukostnaden regnes ut mens man skriver) ---------
  function hireQty(): number {
    const input = element.querySelector<HTMLInputElement>('[data-hire-qty]');
    return Math.max(0, Math.floor(Number(input?.value) || 0));
  }
  function bindHireInput() {
    const view = current();
    const input = element.querySelector<HTMLInputElement>('[data-hire-qty]');
    const cost = element.querySelector<HTMLElement>('[data-hire-cost]');
    const btn = element.querySelector<HTMLButtonElement>('[data-hire-btn]');
    if (!input || !cost || !btn || view.name !== 'iHire') return;
    const refresh = () => {
      const total = hireQty() * roleById(view.role).interview;
      cost.textContent = formatMoneyWhole(total);
      btn.disabled = hireQty() <= 0;
      btn.classList.toggle('poor', total > state.balance);
    };
    input.addEventListener('input', refresh);
    refresh();
  }

  // --- Byggefirma: skrivefeltene for ressurser (summen regnes ut mens man skriver) ---------
  function resourceAmounts() {
    const amounts = emptyResources();
    element.querySelectorAll<HTMLInputElement>('[data-res]').forEach((input) => {
      const r = RESOURCES.find((x) => x.id === input.dataset.res)!;
      amounts[r.id] = Math.min(1e12, Math.max(0, Math.floor(Number(input.value) || 0)));
    });
    return amounts;
  }
  function bindResourceInputs() {
    const sum = element.querySelector<HTMLElement>('[data-res-sum]');
    const btn = element.querySelector<HTMLButtonElement>('[data-res-submit]');
    if (!sum || !btn) return;
    const refresh = () => {
      const cost = RESOURCES.reduce((total, r) => total + resourceAmounts()[r.id] * r.price, 0);
      sum.textContent = formatMoneyFull(cost);
      btn.disabled = cost <= 0;
      btn.classList.toggle('poor', cost > state.balance);
    };
    element.querySelectorAll('[data-res]').forEach((i) => i.addEventListener('input', refresh));
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
    if (action !== 'i-drop') confirmDrop = false;
    if (action !== 'i-fire') confirmFire = false;

    switch (action) {
      case 'back':
        return back();
      case 'start':
        if (slotsFull(state)) {
          showToast('Alle plassene er i bruk – kjøp flere plasser');
          slotsOpen = true;
          slotsAnimate = true;
          return render();
        }
        return go({ name: 'categories' });

      // --- Bedriftsplasser ---
      case 'slots':
        slotsOpen = true;
        slotsAnimate = true;
        return render();
      case 'slots-close':
        // Trykk på den mørke bakgrunnen eller krysset (ikke inne i vinduet)
        if (target.classList.contains('slots-backdrop') && e.target !== target) return;
        slotsOpen = false;
        return render();
      case 'buy-slot': {
        const result = buySlot(state);
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result === 'ok') showToast(`Plass ${nextSlot(state)} bygges – klar om 4 timer`);
        return render();
      }
      case 'category': {
        // Kategorier med bare én type (taxi) går rett til navnet
        const types = typesIn(category as BusinessCategoryId);
        if (types.length === 1) return go({ name: 'name', type: types[0].id });
        return go({ name: 'types', category: category as BusinessCategoryId });
      }

      // --- Byggefirma ---
      case 'c-projects':
        return go({ name: 'projects', id });
      case 'c-new':
        return go({ name: 'buildNew', id, short: null });
      case 'c-refill':
        return go({ name: 'resources', id });
      case 'c-build': {
        const b = find(id);
        if (!b || view.name !== 'buildNew') return;
        const result = startProject(state, b, target.dataset.building!);
        if (result === 'full') {
          shake(target);
          return showToast(`Du kan ikke bygge flere enn ${MAX_PROJECTS} på en gang`);
        }
        if (result === 'resources') {
          view.short = target.dataset.building!;
          shake(target);
          return render();
        }
        if (result !== 'ok') return;
        view.short = null;
        showToast(`${buildingById(target.dataset.building!).name} bygges`);
        stack.pop();
        return go({ name: 'projects', id });
      }
      case 'c-procure':
        procureFor = target.dataset.building!;
        procureAnimate = true;
        return render();
      case 'c-procure-close':
        if (target.classList.contains('con-backdrop') && e.target !== target) return;
        procureFor = null;
        return render();
      case 'c-buy-build': {
        const b = find(id);
        if (!b || view.name !== 'buildNew') return;
        const result = startProject(state, b, target.dataset.building!, true);
        if (result === 'full') {
          shake(target);
          return showToast(`Du kan ikke bygge flere enn ${MAX_PROJECTS} på en gang`);
        }
        if (result !== 'ok') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        procureFor = null;
        view.short = null;
        showToast(`${buildingById(target.dataset.building!).name} bygges`);
        stack.pop();
        return go({ name: 'projects', id });
      }
      case 'c-sell': {
        const b = find(id);
        if (!b) return;
        const got = sellProject(state, b, target.dataset.project!);
        if (got > 0) showToast(`Solgt for ${formatMoney(got)}`);
        return render();
      }
      case 'c-refill-buy': {
        const b = find(id);
        if (!b) return;
        if (!buyResources(state, b, resourceAmounts())) {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        showToast('Ressursene er fylt på');
        return back();
      }

      // --- Bilforhandler ---
      case 'd-service':
        return go({ name: 'dService', id, filter: 'all' });
      case 'd-showroom':
        return go({ name: 'dShowroom', id });
      case 'd-market':
        return go({ name: 'dMarket', id });
      case 'd-mcar':
        return go({ name: 'dMarketCar', id, car: target.dataset.car! });
      case 'd-car':
        return go({ name: 'dCar', id, car: target.dataset.car!, sel: [] });
      case 'd-filter':
        if (view.name === 'dService') view.filter = target.dataset.filter as ServiceFilter;
        return render();
      case 'd-diag': {
        const b = find(id);
        if (!b) return;
        const result = buyDiagnostics(b, dealerPay(state, b), target.dataset.car!);
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result === 'ok') showToast('Diagnosen er utført');
        return render();
      }
      case 'd-buy': {
        const b = find(id);
        if (!b) return;
        const m = marketOf(b).find((x) => x.id === target.dataset.car);
        const result = buyMarketCar(b, dealerPay(state, b), target.dataset.car!);
        if (result === 'full') {
          shake(target);
          return showToast('Verkstedet er fullt');
        }
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result !== 'ok') return render();
        showToast(`Du kjøpte ${dealerModel(m!.model).name}`);
        // Tilbake til forsiden av bilforhandleren
        stack = [{ name: 'home' }, { name: 'detail', id }];
        render();
        window.scrollTo(0, 0);
        return;
      }
      case 'd-part': {
        if (view.name !== 'dCar') return;
        const part = target.dataset.part as PartId;
        view.sel = view.sel.includes(part) ? view.sel.filter((p) => p !== part) : [...view.sel, part];
        return render();
      }
      case 'd-repair': {
        const b = find(id);
        if (!b || view.name !== 'dCar') return;
        const result = startRepair(b, dealerPay(state, b), view.car, view.sel);
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result === 'ok') {
          view.sel = [];
          showToast('Reparasjonen har startet');
        }
        return render();
      }
      case 'd-sell': {
        const b = find(id);
        if (!b) return;
        const result = putUpForSale(b, target.dataset.car!);
        if (result === 'full') {
          shake(target);
          return showToast('Utstillingen er full');
        }
        if (result !== 'ok') return render();
        showToast('Bilen står nå i utstillingen');
        return back();
      }
      case 'd-spec':
        return go({ name: 'dSpec', id, pick: null });
      case 'd-spec-pick':
        if (view.name === 'dSpec') view.pick = target.dataset.seg as SegmentId;
        return render();
      case 'd-spec-change': {
        if (view.name !== 'dSpec') return;
        const b = find(view.id);
        if (!b) return;
        if (changeSegment(b, target.dataset.seg as SegmentId)) {
          view.pick = null;
          showToast('Spesialiseringen byttes – det tar 15 minutter');
        }
        return render();
      }
      case 'd-expand':
        return go({ name: 'dExpand', id, kind: target.dataset.kind as 'service' | 'showroom' });
      case 'd-expand-buy': {
        const b = find(id);
        if (!b) return;
        const result = expandDealer(b, dealerPay(state, b), target.dataset.kind as 'service' | 'showroom', Number(target.dataset.index));
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result === 'ok') showToast('Utvidelsen har startet');
        return render();
      }
      case 'd-skills':
        return go({ name: 'dSkills', id });

      // --- Bank ---
      case 'b-control': {
        const b = find(id);
        if (!b) return;
        // Skyveknappene starter på rentene som er lagret nå (endringer lagres bare med "Lagre")
        return go({ name: 'bControl', id, deposit: bankOf(b).deposit, loan: bankOf(b).loan });
      }
      case 'b-save':
      case 'b-default': {
        const b = find(id);
        if (!b || view.name !== 'bControl') return;
        if (action === 'b-save') setRates(b, view.deposit, view.loan);
        else setRates(b, DEFAULT_DEPOSIT, DEFAULT_LOAN);
        showToast(action === 'b-save' ? 'Rentene er lagret' : 'Rentene er satt til standard');
        return back();
      }
      case 'b-expand': {
        const b = find(id);
        if (!b) return;
        const result = expandVault(b, dealerPay(state, b));
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result === 'ok') showToast('Utvidelsen av hvelvet har startet');
        return render();
      }

      // --- IT-selskap ---
      case 'i-projects':
        return go({ name: 'iProjects', id, tab: target.dataset.tab as 'progress' | 'done' });
      case 'i-project':
        return go({ name: 'iProject', id, project: target.dataset.project! });
      case 'i-sell': {
        const b = find(id);
        if (!b) return;
        const before = state.balance;
        if (sellItProject(b, dealerPay(state, b), target.dataset.project!) > 0) {
          showToast(`Solgt for ${formatMoney(state.balance - before)}`);
        }
        if (view.name === 'iProject') return back();
        return render();
      }
      case 'i-drop': {
        const b = find(id);
        if (!b) return;
        if (!confirmDrop) {
          confirmDrop = true;
          return render();
        }
        confirmDrop = false;
        dropProject(b, target.dataset.project!);
        showToast('Prosjektet er avbrutt');
        return back();
      }
      case 'i-new':
        return go({ name: 'iNew', id });
      case 'i-setup':
        return go({ name: 'iSetup', id, def: target.dataset.def!, picks: emptyPicks() });
      case 'i-team':
        if (view.name !== 'iSetup') return;
        return go({ name: 'iTeam', id, def: view.def, picks: view.picks, skill: target.dataset.skill as SkillId });
      case 'i-pick': {
        if (view.name !== 'iTeam') return;
        const emp = target.dataset.emp!;
        const list = view.picks[view.skill];
        view.picks[view.skill] = list.includes(emp) ? list.filter((x) => x !== emp) : [...list, emp];
        return render();
      }
      case 'i-auto': {
        if (view.name !== 'iTeam') return;
        const b = find(view.id);
        if (!b) return;
        view.picks[view.skill] = autoPick(b, projectDef(view.def), view.skill);
        return render();
      }
      case 'i-start': {
        const b = find(id);
        if (!b || view.name !== 'iSetup') return;
        if (startItProject(b, view.def, view.picks) !== 'ok') {
          shake(target);
          return showToast('Teamene har ikke nok skill');
        }
        showToast(`${projectDef(view.def).name} er startet`);
        // Tilbake til forsiden av IT-selskapet
        stack = [{ name: 'home' }, { name: 'detail', id }];
        render();
        window.scrollTo(0, 0);
        return;
      }
      case 'i-role':
        return go({ name: 'iRole', id, role: target.dataset.role as RoleId, sort: 'salary-desc' });
      case 'i-sort':
        if (view.name === 'iRole') view.sort = target.dataset.sort as StaffSort;
        return render();
      case 'i-emp':
        if (view.name !== 'iRole') return;
        return go({ name: 'iEmployee', id: view.id, emp: target.dataset.emp! });
      case 'i-fire': {
        const b = find(id);
        if (!b) return;
        if (!confirmFire) {
          confirmFire = true;
          return render();
        }
        confirmFire = false;
        const e = employeeById(b, target.dataset.emp!);
        const result = fire(b, target.dataset.emp!);
        if (result === 'busy') return showToast('Personen jobber på et prosjekt');
        if (result === 'ok' && e) showToast(`${e.name} har fått sparken`);
        return back();
      }
      case 'i-hire':
        return go({ name: 'iHire', id, role: target.dataset.role as RoleId });
      case 'i-hire-do': {
        const b = find(id);
        if (!b) return;
        const qty = hireQty();
        const result = quickHire(b, dealerPay(state, b), target.dataset.role as RoleId, qty);
        if (result === 'places') {
          shake(target);
          return showToast('Ikke nok ledige arbeidsplasser – kjøp et større kontor');
        }
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result !== 'ok') return;
        showToast(`Ansatte ${qty} × ${roleById(target.dataset.role as RoleId).name.toLowerCase()}`);
        return back();
      }
      case 'i-offers':
        return go({ name: 'iOffers', id });
      case 'i-refresh': {
        const b = find(id);
        if (!b) return;
        refreshOffers(b);
        return render();
      }
      case 'i-offer':
        if (view.name !== 'iOffers') return;
        return go({ name: 'iOffer', id: view.id, offer: target.dataset.offer! });
      case 'i-offer-hire': {
        const b = find(id);
        if (!b) return;
        const e = itOf(b).offers.find((o) => o.id === target.dataset.offer);
        const result = hireOffer(b, target.dataset.offer!);
        if (result === 'places') {
          shake(target);
          return showToast('Ikke nok ledige arbeidsplasser – kjøp et større kontor');
        }
        if (result === 'ok' && e) showToast(`${e.name} er ansatt`);
        return back();
      }
      case 'i-office': {
        const b = find(id);
        if (!b) return;
        const result = buyOffice(b, dealerPay(state, b), target.dataset.office!);
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result === 'ok') showToast('Utvidelsen har startet');
        return render();
      }

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
      <div class="biz-title-row">
        <h1 class="biz-title">Bedrifter</h1>
        <button class="biz-slots-btn" data-action="slots">${icons.slots}<span>Bedriftsplasser</span></button>
      </div>
      <div class="biz-total">
        <strong>${formatMoney(totalIncomePerHour(state))}</strong>
        <span>Total inntekt per time</span>
      </div>
      <button class="biz-start" data-action="start">Start en bedrift</button>
      <div class="biz-list-head">
        <h2>Mine bedrifter</h2>
        <span>${state.businesses.length}/${state.businessSlots}</span>
      </div>
      <div class="biz-list">${list}</div>
    `;
  }

  /** Vinduet der man kjøper flere bedriftsplasser. */
  function renderSlots(): string {
    const animate = slotsAnimate;
    slotsAnimate = false;
    const building = state.slotExpansionEnd !== null;
    const slot = nextSlot(state);
    let main: string;
    if (building) {
      const left = Math.max(0, (state.slotExpansionEnd! - Date.now()) / 1000);
      const pct = Math.min(100, Math.max(0, Math.floor((1 - left / SLOT_SECONDS) * 100)));
      main = `
        <p class="slots-label">Plass ${slot} bygges</p>
        <div class="slots-card">
          <div class="slots-card-text">
            <span>Gjenstående tid</span>
            <strong class="slots-time">${formatDuration(left, false)}</strong>
          </div>
          ${slotsArt()}
          <div class="slots-progress"><span style="width:${pct}%"></span></div>
          <span class="slots-pct">${pct} %</span>
        </div>`;
    } else if (state.businessSlots >= MAX_SLOTS) {
      main = `
        <div class="slots-card">
          <div class="slots-card-text">
            <span class="slots-chip">Alle plasser</span>
            <strong class="slots-time">${MAX_SLOTS} av ${MAX_SLOTS}</strong>
            <span>Du har kjøpt alle plassene</span>
          </div>
          ${slotsArt()}
        </div>`;
    } else {
      const price = slotPrice(slot);
      main = `
        <div class="slots-card">
          <div class="slots-card-text">
            <span class="slots-chip">Plass ${slot}</span>
            <span>Pris:</span>
            <strong>${formatMoney(price)}</strong>
          </div>
          ${slotsArt()}
        </div>
        <button class="slots-buy ${state.balance >= price ? '' : 'poor'}" data-action="buy-slot">Kjøp</button>
        <p class="slots-note">Det tar 4 timer før plassen er klar.</p>`;
    }

    // De neste plassene etter den man kjøper nå, og den siste (låst)
    const upcoming: string[] = [];
    for (let n = slot + 1; n <= Math.min(slot + 2, MAX_SLOTS - 1); n++) {
      upcoming.push(`<div class="slots-next"><strong>Plass ${n}</strong><span>${formatMoney(slotPrice(n))}</span></div>`);
    }
    const showLast = slot < MAX_SLOTS;
    const sep = upcoming.length ? '<span class="slots-sep"></span>' : '';
    const last = showLast ? `${sep}<div class="slots-next"><strong>Plass ${MAX_SLOTS}</strong><span class="slots-lock">${icons.lock}</span></div>` : '';
    const next = upcoming.length || showLast
      ? `
        <p class="slots-label">Neste utvidelser</p>
        <div class="slots-next-row">${upcoming.join('')}${last}</div>`
      : '';

    return `
      <div class="slots-backdrop ${animate ? 'animate' : ''}" data-action="slots-close">
        <div class="slots-modal">
          <h2>Kjøp plasser til bedrifter</h2>
          <p class="slots-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>
          ${main}
          ${next}
        </div>
        <button class="slots-x" data-action="slots-close" aria-label="Lukk">${icons.close}</button>
      </div>`;
  }

  /** Den lille statistikken på en bedrift i lista (kjøretøy eller trinn). */
  function rowStat(b: Business): string {
    const t = typeById(b.type);
    if (engineOf(b) === 'fleet') return `<span>${CATEGORY_ICON[t.category]} ${carsOf(b).length}/${capacityOf(b)}</span>`;
    if (engineOf(b) === 'build') return `<span>${icons.clockDashed} ${underConstruction(b).length} under bygging · ${readyForSale(b).length} klare</span>`;
    if (engineOf(b) === 'dealer') return `<span>${icons.wrench} ${inService(b).length} på verkstedet · ${forSale(b).length} til salgs</span>`;
    if (engineOf(b) === 'bank') return `<span>${icons.bill} ${formatMoneyWhole(bankOf(b).funds)} i hvelvet</span>`;
    if (engineOf(b) === 'it') return `<span>${icons.hourglass} ${inProgress(b).length} pågår · ${completed(b).length} ferdige · ${formatMoneyWhole(wagesPerHour(b))} lønn per time</span>`;
    return `<span>${icons.stage} Trinn ${b.stage} av ${MAX_STAGE}</span>`;
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
          ${rowStat(b)}
          ${expanding ? `<span class="biz-row-timer">${icons.clock} ${formatDuration((b.expansionEnd! - Date.now()) / 1000, false)}</span>` : ''}
        </span>
        ${engineOf(b) === 'build'
          ? `<span class="biz-row-income"><b>${formatMoneyRounded(readyValue(b))}</b> klart for salg</span>`
          : engineOf(b) === 'dealer'
          ? `<span class="biz-row-income"><b>${formatMoneyRounded(showroomValue(b))}</b> til salgs</span>`
          : `<span class="biz-row-income ${incomePerHour(b) < 0 ? 'negative' : ''}"><b>${formatMoneyRounded(incomePerHour(b))}</b> per time</span>`}
      </button>`;
  }

  function renderCategories(): string {
    const cards = CATEGORIES.map(
      (c) => `
        <button class="biz-cat" data-action="category" data-category="${c.id}">
          <span class="biz-icon lg cat-${c.color}">${CATEGORY_ICON[c.id]}</span>
          <strong>${c.name}</strong>
          <span>Fra ${formatMoneyWhole(cheapestIn(c.id))}</span>
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
    const factory = t.category === 'factory';
    const headIcon = factory ? icons.factory : icons.store;
    const text = factory
      ? { title: 'Åpning av nye verksteder', explain: 'Flere verksteder gir mer inntekt.', button: 'Åpne nye verksteder' }
      : { title: 'Åpning av nye utsalgssteder', explain: 'Flere butikker gir mer inntekt.', button: 'Åpne nye utsalgssteder' };

    let action: string;
    if (expanding) {
      action = `
        <div class="biz-outlets">
          <div class="biz-outlets-head">${headIcon}<h2>Utvidelse pågår</h2></div>
          <strong class="biz-big">${formatDuration((b.expansionEnd! - Date.now()) / 1000)}</strong>
          <span class="biz-muted">Gjenstående tid</span>
        </div>`;
    } else if (isMaxStage(b)) {
      action = `
        <div class="biz-outlets">
          <div class="biz-outlets-head">${headIcon}<h2>Fullt utbygd</h2></div>
          <span class="biz-muted">Bedriften har nådd høyeste trinn (${MAX_STAGE}).</span>
        </div>`;
    } else {
      const cost = expansionCost(b);
      action = `
        <div class="biz-outlets">
          <div class="biz-outlets-head">${headIcon}<h2>${text.title}</h2></div>
          <p class="biz-explain">${text.explain} Utvidelsen tar ${formatDuration(expansionSeconds(b), false)}, og bedriften tjener som før mens den pågår.</p>
          <strong class="biz-big">${formatMoneyRounded(cost)}</strong>
          <span class="biz-muted">Nødvendig investering</span>
          <strong class="biz-big growth">${icons.arrowUp} ${formatMoneyRounded(expectedGrowth(b))}</strong>
          <span class="biz-muted">Forventet økning i inntekt per time</span>
        </div>
        <button class="biz-green-btn ${state.balance >= cost ? '' : 'poor'}" data-action="expand" data-id="${b.id}">${text.button}</button>
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
      confirmDrop = false;
      confirmFire = false;
      slotsOpen = false;
      procureFor = null;
      render();
    },
    navHidden: () => stack.length > 1 || slotsOpen, // menyen vises bare på oversikten
    onBack() {
      if (procureFor) {
        procureFor = null;
        render();
        return true;
      }
      if (slotsOpen && stack.length <= 1) {
        slotsOpen = false;
        render();
        return true;
      }
      if (stack.length <= 1) return false;
      back();
      return true;
    },
    update() {
      // Tall som endres (inntekt, nedtelling, saldo) tegnes på nytt én gang i sekundet.
      // Sider med skrivefelt tegnes ikke på nytt (da ville teksten man skriver forsvinne).
      const view = current().name;
      if (view === 'name' || view === 'rename' || view === 'categories' || view === 'types' || view === 'resources' || view === 'iHire' || view === 'bControl') return;
      // Ikke tegn på nytt mens man bekrefter (teksten "Trykk igjen" skal bli stående)
      if (confirmDrop || confirmFire) return;
      // Bruktbilmarkedet (100 bilder) og ferdighetene endrer seg ikke av seg selv
      if (view === 'dMarket' || view === 'dMarketCar' || view === 'dSkills') return;
      if (view === 'settings' && confirmClose) return;
      if (!pressing && performance.now() - lastRender > 1000) render();
    },
  };
}

/** Egen tegning: plattform med blokker og en gullmynt. */
function slotsArt(): string {
  return `<svg class="slots-art" viewBox="0 0 160 120" aria-hidden="true">
    <path d="M80 112 10 78l70-34 70 34Z" fill="#eef4ff" stroke="#c9dafc" stroke-width="1.5"/>
    <path d="M80 104 22 76l58-28 58 28Z" fill="none" stroke="#9db9f5" stroke-width="1.5" stroke-dasharray="2 5"/>
    <path d="M48 78V64l22 11v14Z" fill="#dfe6ee"/><path d="M70 89V75l20-10v14Z" fill="#f5f7fa"/><path d="M48 64l20-10 22 11-20 10Z" fill="#fff" stroke="#dfe6ee"/>
    <path d="M78 70V44l20 10v26Z" fill="#5fae9c"/><path d="M98 80V54l18-9v26Z" fill="#8fd1bf"/><path d="M78 44l18-9 20 10-18 9Z" fill="#b8e6d9"/>
    <path d="M96 54V30l16 8v24Z" fill="#cfe9e3" opacity=".8"/><path d="M112 62V38l14-7v24Z" fill="#e8f6f2" opacity=".8"/><path d="M96 30l14-7 16 8-14 7Z" fill="#f1fbf8"/>
    <ellipse cx="116" cy="20" rx="15" ry="16" fill="#e2a42a"/><ellipse cx="114" cy="19" rx="14" ry="15" fill="#f7c948"/>
    <ellipse cx="114" cy="19" rx="10" ry="11" fill="none" stroke="#e2a42a" stroke-width="2"/>
    <text x="114" y="25" text-anchor="middle" font-size="16" font-weight="800" font-family="system-ui, sans-serif" fill="#c9861a">$</text>
  </svg>`;
}

/** Navn skrevet av spilleren vises som tekst, aldri som HTML. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
